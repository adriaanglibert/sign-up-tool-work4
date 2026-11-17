import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Matrix, Preference, Settings, Submission } from "@/lib/types";

type LockState = { tail: Promise<void> };
const globalStore = globalThis as typeof globalThis & {
  registrationStoreLock?: LockState;
};
const lock = (globalStore.registrationStoreLock ??= {
  tail: Promise.resolve(),
});
const dataDirectory = path.join(process.cwd(), "data");

async function withStoreLock<T>(task: () => Promise<T>): Promise<T> {
  const previous = lock.tail;
  let release = () => {};
  lock.tail = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await task();
  } finally {
    release();
  }
}

async function readJson<T>(filename: string): Promise<T> {
  const contents = await readFile(path.join(dataDirectory, filename), "utf8");
  return JSON.parse(contents) as T;
}

async function writeJsonBatch(
  entries: Array<[string, unknown]>,
): Promise<void> {
  await mkdir(dataDirectory, { recursive: true });
  const staged: Array<{ temporary: string; destination: string }> = [];
  try {
    for (const [filename, value] of entries) {
      const destination = path.join(dataDirectory, filename);
      const temporary = `${destination}.${process.pid}.${randomUUID()}.tmp`;
      await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
        flag: "wx",
      });
      staged.push({ temporary, destination });
    }
    for (const file of staged) {
      await rename(file.temporary, file.destination);
    }
  } catch (error) {
    await Promise.all(
      staged.map(({ temporary }) => unlink(temporary).catch(() => undefined)),
    );
    throw error;
  }
}

async function readAll() {
  const [matrix, submissions, settings] = await Promise.all([
    readJson<Matrix>("matrix.json"),
    readJson<Submission[]>("submissions.json"),
    readJson<Settings>("settings.json"),
  ]);
  return { matrix, submissions, settings };
}

export async function getPublicSnapshot() {
  return withStoreLock(async () => {
    const { matrix, settings } = await readAll();
    return {
      matrix: {
        branches: matrix.branches,
        organizations: matrix.organizations.map(({ id, name }) => ({
          id,
          name,
        })),
      },
      settings,
    };
  });
}

export async function getAdminSnapshot() {
  return withStoreLock(async () => {
    const { matrix, submissions, settings } = await readAll();
    return {
      matrix,
      settings,
      submissions: submissions.sort((left, right) =>
        right.submittedAt.localeCompare(left.submittedAt),
      ),
    };
  });
}

export async function createSubmission(input: {
  studentName: string;
  preferences: Preference[];
}): Promise<{ submission?: Submission; error?: string; status?: number }> {
  return withStoreLock(async () => {
    const { matrix, submissions, settings } = await readAll();
    const studentName = input.studentName.trim();
    if (!settings.isOpen)
      return {
        error: "De inschrijvingen zijn momenteel gesloten.",
        status: 403,
      };
    if (!studentName || studentName.length > 120) {
      return {
        error: "Vul een volledige naam in van maximaal 120 tekens.",
        status: 400,
      };
    }
    if (input.preferences.length !== 3) {
      return { error: "Kies exact drie voorkeuren.", status: 400 };
    }

    const keys = input.preferences.map(({ branchId }) => branchId);
    if (new Set(keys).size !== 3) {
      return {
        error: "Je voorkeuren moeten drie verschillende Branches zijn.",
        status: 400,
      };
    }

    for (const preference of input.preferences) {
      if (!matrix.branches.some(({ id }) => id === preference.branchId)) {
        return { error: "Een gekozen Branch bestaat niet.", status: 400 };
      }
    }

    const normalizedName = studentName.toLocaleLowerCase("nl-BE");
    if (
      submissions.some(
        ({ studentName: existingName }) =>
          existingName.trim().toLocaleLowerCase("nl-BE") === normalizedName,
      )
    ) {
      return {
        error: "Er bestaat al een inschrijving op deze naam.",
        status: 409,
      };
    }

    let assignedCombination: Submission["assignedCombination"] = null;
    for (const preference of input.preferences) {
      for (const organization of matrix.organizations) {
        const cell = organization.cells[preference.branchId];
        if (cell.assignedCount < cell.maxCapacity) {
          cell.assignedCount += 1;
          assignedCombination = {
            organizationId: organization.id,
            branchId: preference.branchId,
          };
          break;
        }
      }
      if (assignedCombination) break;
    }

    const submission: Submission = {
      id: randomUUID(),
      submittedAt: new Date().toISOString(),
      studentName,
      preferences: input.preferences as [Preference, Preference, Preference],
      assignedCombination,
      status: assignedCombination ? "Toegewezen" : "Wachtlijst",
    };
    submissions.push(submission);
    await writeJsonBatch([
      ["matrix.json", matrix],
      ["submissions.json", submissions],
    ]);
    return { submission };
  });
}

export async function updateCellCapacity(input: {
  organizationId: string;
  branchId: string;
  maxCapacity: number;
}): Promise<{ matrix?: Matrix; error?: string; status?: number }> {
  return withStoreLock(async () => {
    const { matrix } = await readAll();
    const organization = matrix.organizations.find(
      ({ id }) => id === input.organizationId,
    );
    const cell = organization?.cells[input.branchId];
    if (!cell)
      return { error: "De gekozen combinatie bestaat niet.", status: 404 };
    if (
      !Number.isInteger(input.maxCapacity) ||
      input.maxCapacity < cell.assignedCount ||
      input.maxCapacity > 999
    ) {
      return {
        error: `Capaciteit moet een geheel getal zijn tussen ${cell.assignedCount} en 999.`,
        status: 400,
      };
    }
    cell.maxCapacity = input.maxCapacity;
    await writeJsonBatch([["matrix.json", matrix]]);
    return { matrix };
  });
}

export async function updateRegistrationStatus(
  isOpen: boolean,
): Promise<Settings> {
  return withStoreLock(async () => {
    const settings = { isOpen };
    await writeJsonBatch([["settings.json", settings]]);
    return settings;
  });
}

export async function resetSubmissions(): Promise<void> {
  await withStoreLock(async () => {
    const { matrix } = await readAll();
    for (const organization of matrix.organizations) {
      for (const cell of Object.values(organization.cells))
        cell.assignedCount = 0;
    }
    await writeJsonBatch([
      ["matrix.json", matrix],
      ["submissions.json", []],
    ]);
  });
}
