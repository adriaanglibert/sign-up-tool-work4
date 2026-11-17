"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  Check,
  ChevronDown,
  CircleAlert,
  FileJson2,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Users,
} from "lucide-react";
import type { Matrix, Settings, Submission } from "@/lib/types";

type AdminSnapshot = {
  matrix: Matrix;
  settings: Settings;
  submissions: Submission[];
};
type AccessState = "checking" | "signed-out" | "signed-in";

async function responseError(response: Response): Promise<string> {
  const body = await response.json().catch(() => ({}));
  return typeof body.error === "string"
    ? body.error
    : "Er liep iets mis. Probeer opnieuw.";
}

function cellKey(organizationId: string, branchId: string) {
  return `${organizationId}:${branchId}`;
}

export function AdminDashboard() {
  const [access, setAccess] = useState<AccessState>("checking");
  const [snapshot, setSnapshot] = useState<AdminSnapshot | null>(null);
  const [password, setPassword] = useState("");
  const [query, setQuery] = useState("");
  const [organizationFilter, setOrganizationFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadData() {
    const response = await fetch("/api/admin/data", { cache: "no-store" });
    if (response.status === 401) {
      setAccess("signed-out");
      setSnapshot(null);
      return;
    }
    if (!response.ok) throw new Error(await responseError(response));
    setSnapshot((await response.json()) as AdminSnapshot);
    setAccess("signed-in");
  }

  useEffect(() => {
    const initialRequest = window.setTimeout(() => {
      void loadData().catch((loadError: unknown) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Beheerdersgegevens konden niet worden geladen.",
        );
        setAccess("signed-out");
      });
    }, 0);
    return () => window.clearTimeout(initialRequest);
  }, []);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      setPassword("");
      await loadData();
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Aanmelden is niet gelukt.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function updateCapacity(organizationId: string, branchId: string) {
    const key = cellKey(organizationId, branchId);
    const maxCapacity = Number(drafts[key]);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/matrix", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, branchId, maxCapacity }),
      });
      if (response.status === 401) return setAccess("signed-out");
      if (!response.ok) throw new Error(await responseError(response));
      const body = (await response.json()) as { matrix: Matrix };
      setSnapshot((current) =>
        current ? { ...current, matrix: body.matrix } : current,
      );
      setDrafts((current) => ({ ...current, [key]: String(maxCapacity) }));
      setMessage("Capaciteit opgeslagen.");
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Capaciteit opslaan is niet gelukt.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleRegistration() {
    if (!snapshot) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOpen: !snapshot.settings.isOpen }),
      });
      if (response.status === 401) return setAccess("signed-out");
      if (!response.ok) throw new Error(await responseError(response));
      const body = (await response.json()) as { settings: Settings };
      setSnapshot((current) =>
        current ? { ...current, settings: body.settings } : current,
      );
      setMessage(
        body.settings.isOpen
          ? "Inschrijvingen geopend."
          : "Inschrijvingen gesloten.",
      );
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "De status kon niet worden aangepast.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function resetAll() {
    if (
      !window.confirm(
        "Alle inschrijvingen wissen en de tellers terug op nul zetten? Deze actie kan niet ongedaan worden.",
      )
    )
      return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/reset", { method: "POST" });
      if (response.status === 401) return setAccess("signed-out");
      if (!response.ok) throw new Error(await responseError(response));
      await loadData();
      setMessage(
        "Alle inschrijvingen zijn verwijderd en de capaciteit is vrijgegeven.",
      );
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Resetten is niet gelukt.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setSnapshot(null);
    setAccess("signed-out");
  }

  const filteredSubmissions = useMemo(() => {
    if (!snapshot) return [];
    const normalizedQuery = query.trim().toLocaleLowerCase("nl-BE");
    return snapshot.submissions.filter((submission) => {
      const matchesName =
        !normalizedQuery ||
        submission.studentName
          .toLocaleLowerCase("nl-BE")
          .includes(normalizedQuery);
      const matchesOrganization =
        !organizationFilter ||
        submission.assignedCombination?.organizationId === organizationFilter;
      const matchesBranch =
        !branchFilter ||
        submission.preferences.some(
          (preference) => preference.branchId === branchFilter,
        );
      return matchesName && matchesOrganization && matchesBranch;
    });
  }, [snapshot, query, organizationFilter, branchFilter]);

  function combinationName(
    preference: Submission["assignedCombination"],
  ): string {
    if (!preference || !snapshot) return "Wachtlijst";
    const organization =
      snapshot.matrix.organizations.find(
        ({ id }) => id === preference.organizationId,
      )?.name ?? preference.organizationId;
    const branch =
      snapshot.matrix.branches.find(({ id }) => id === preference.branchId)
        ?.name ?? preference.branchId;
    return `${organization} · ${branch}`;
  }

  const assignedCount =
    snapshot?.submissions.filter(
      ({ assignedCombination }) => assignedCombination !== null,
    ).length ?? 0;
  const totalCapacity =
    snapshot?.matrix.organizations.reduce(
      (total, organization) =>
        total +
        Object.values(organization.cells).reduce(
          (sum, cell) => sum + cell.maxCapacity,
          0,
        ),
      0,
    ) ?? 0;
  const usedCapacity =
    snapshot?.matrix.organizations.reduce(
      (total, organization) =>
        total +
        Object.values(organization.cells).reduce(
          (sum, cell) => sum + cell.assignedCount,
          0,
        ),
      0,
    ) ?? 0;

  return (
    <main className="app-shell admin-shell">
      <header className="topbar">
        <Link
          className="brand"
          href="/"
          aria-label="Terug naar de inschrijvingen"
        >
          <span className="brand-mark">
            <Users size={18} aria-hidden="true" />
          </span>
          <span>
            branch<span className="brand-dot">.</span>
          </span>
        </Link>
        <div className="topbar-right">
          <span className="admin-breadcrumb">BEHEERDERSOMGEVING</span>
          <Link className="admin-link" href="/">
            Studentenweergave{" "}
            <ChevronDown size={14} className="breadcrumb-arrow" />
          </Link>
        </div>
      </header>

      {access === "checking" ? (
        <div className="loading-state">
          <LoaderCircle className="spin" size={20} /> Beveiligde sessie
          controleren…
        </div>
      ) : access === "signed-out" ? (
        <section className="login-panel">
          <div className="login-icon">
            <LockKeyhole size={21} />
          </div>
          <p className="eyebrow">
            <span className="eyebrow-line" /> BEHEERDERSOMGEVING
          </p>
          <h1>Aanmelden</h1>
          <p className="login-copy">
            Meld je aan om inschrijvingen en capaciteit te beheren.
          </p>
          <form onSubmit={login}>
            <label htmlFor="admin-password">Beheerderswachtwoord</label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Wachtwoord"
            />
            {error && (
              <p className="form-message error-message" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="submit-button" disabled={busy}>
              {busy ? (
                <>
                  <LoaderCircle size={17} className="spin" /> Aanmelden…
                </>
              ) : (
                <>
                  Naar het dashboard <ArrowDownToLine size={17} />
                </>
              )}
            </button>
          </form>
          <Link href="/" className="back-link">
            Terug naar de inschrijvingen
          </Link>
        </section>
      ) : snapshot ? (
        <>
          <section className="admin-intro">
            <div>
              <p className="eyebrow">
                <span className="eyebrow-line" /> OVERZICHT
              </p>
              <h1>Beheer inschrijvingen</h1>
              <p>
                Capaciteit, toewijzingen en inschrijvingsstatus op één plek.
              </p>
            </div>
            <div className="admin-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  void loadData().catch((loadError: unknown) =>
                    setError(
                      loadError instanceof Error
                        ? loadError.message
                        : "Vernieuwen mislukt.",
                    ),
                  )
                }
                disabled={busy}
              >
                <RefreshCw size={15} /> Vernieuwen
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => void logout()}
              >
                <LogOut size={15} /> Afmelden
              </button>
            </div>
          </section>

          {(error || message) && (
            <div
              className={`admin-feedback ${error ? "error-message" : "success-message"}`}
              role={error ? "alert" : "status"}
            >
              {error ? <CircleAlert size={16} /> : <Check size={16} />}
              {error || message}
            </div>
          )}

          <section className="metrics-row" aria-label="Kerncijfers">
            <div className="metric">
              <span>TOTAAL INSCHRIJVINGEN</span>
              <strong>{snapshot.submissions.length}</strong>
              <small>volgens tijdstip ontvangen</small>
            </div>
            <div className="metric">
              <span>TOEGEWEZEN</span>
              <strong>{assignedCount}</strong>
              <small>
                {snapshot.submissions.length - assignedCount} op de wachtlijst
              </small>
            </div>
            <div className="metric">
              <span>CAPACITEIT BEZET</span>
              <strong>
                {usedCapacity}
                <i> / {totalCapacity}</i>
              </strong>
              <small>plaatsen toegewezen</small>
            </div>
            <div className="registration-control">
              <div>
                <span>INSCHRIJVINGEN</span>
                <strong
                  className={
                    snapshot.settings.isOpen ? "open-text" : "closed-text"
                  }
                >
                  {snapshot.settings.isOpen ? "Open" : "Gesloten"}
                </strong>
              </div>
              <button
                type="button"
                className={`toggle-button ${snapshot.settings.isOpen ? "toggle-on" : ""}`}
                aria-label={
                  snapshot.settings.isOpen
                    ? "Inschrijvingen sluiten"
                    : "Inschrijvingen openen"
                }
                title={
                  snapshot.settings.isOpen
                    ? "Inschrijvingen sluiten"
                    : "Inschrijvingen openen"
                }
                onClick={() => void toggleRegistration()}
                disabled={busy}
              >
                {snapshot.settings.isOpen ? (
                  <ToggleRight size={35} />
                ) : (
                  <ToggleLeft size={35} />
                )}
              </button>
            </div>
          </section>

          <section className="admin-section">
            <div className="admin-section-heading">
              <div>
                <p className="eyebrow">
                  <span className="eyebrow-line" /> PLAATSENBEHEER
                </p>
                <h2>Capaciteit per VZW en Branch</h2>
              </div>
              <span className="table-note">
                Bezetting / totaal · capaciteit kan niet onder bezet aantal
              </span>
            </div>
            <div
              className="admin-table-wrap"
              role="region"
              aria-label="Capaciteit per VZW en Branch"
              tabIndex={0}
            >
              <table className="admin-matrix-table">
                <thead>
                  <tr>
                    <th>VZW</th>
                    {snapshot.matrix.branches.map((branch) => (
                      <th key={branch.id}>{branch.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {snapshot.matrix.organizations.map((organization) => (
                    <tr key={organization.id}>
                      <th>{organization.name}</th>
                      {snapshot.matrix.branches.map((branch) => {
                        const cell = organization.cells[branch.id];
                        const key = cellKey(organization.id, branch.id);
                        const value = drafts[key] ?? String(cell.maxCapacity);
                        const hasChanged = Number(value) !== cell.maxCapacity;
                        return (
                          <td key={branch.id}>
                            <div className="capacity-editor">
                              <span className="capacity-ratio">
                                {cell.assignedCount}
                                <i> / </i>
                                {cell.maxCapacity}
                              </span>
                              <input
                                aria-label={`${organization.name}, ${branch.name}, nieuwe maximumcapaciteit`}
                                type="number"
                                min={cell.assignedCount}
                                max="999"
                                step="1"
                                value={value}
                                onChange={(event) =>
                                  setDrafts((current) => ({
                                    ...current,
                                    [key]: event.target.value,
                                  }))
                                }
                              />
                              <button
                                type="button"
                                className="save-cell-button"
                                title="Capaciteit opslaan"
                                aria-label={`Capaciteit voor ${organization.name}, ${branch.name} opslaan`}
                                onClick={() =>
                                  void updateCapacity(
                                    organization.id,
                                    branch.id,
                                  )
                                }
                                disabled={busy || !hasChanged}
                              >
                                <Save size={14} />
                              </button>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="admin-section submissions-section">
            <div className="admin-section-heading">
              <div>
                <p className="eyebrow">
                  <span className="eyebrow-line" /> INSCHRIJVINGEN
                </p>
                <h2>
                  Ontvangen studenten{" "}
                  <span className="count-badge">
                    {snapshot.submissions.length}
                  </span>
                </h2>
              </div>
              <div className="export-actions">
                <a
                  className="secondary-button"
                  href="/api/admin/export?format=json"
                >
                  <FileJson2 size={15} /> JSON
                </a>
                <a
                  className="secondary-button"
                  href="/api/admin/export?format=csv"
                >
                  <ArrowDownToLine size={15} /> CSV
                </a>
              </div>
            </div>
            <div className="filter-bar">
              <label className="search-box">
                <Search size={16} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Zoek op studentnaam"
                  aria-label="Zoek op studentnaam"
                />
              </label>
              <label className="filter-select">
                <span className="sr-only">Filter op VZW</span>
                <select
                  value={organizationFilter}
                  onChange={(event) =>
                    setOrganizationFilter(event.target.value)
                  }
                >
                  <option value="">Alle VZW&apos;s</option>
                  {snapshot.matrix.organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} />
              </label>
              <label className="filter-select">
                <span className="sr-only">Filter op Branch</span>
                <select
                  value={branchFilter}
                  onChange={(event) => setBranchFilter(event.target.value)}
                >
                  <option value="">Alle Branches</option>
                  {snapshot.matrix.branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} />
              </label>
              <span className="result-count">
                {filteredSubmissions.length} resultaten
              </span>
            </div>
            <div
              className="submission-table-wrap"
              role="region"
              aria-label="Inschrijvingenlijst"
              tabIndex={0}
            >
              <table className="submission-table">
                <thead>
                  <tr>
                    <th>TIJDSTIP</th>
                    <th>STUDENT</th>
                    <th>VOORKEUREN</th>
                    <th>TOEWIJZING</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmissions.map((submission) => (
                    <tr key={submission.id}>
                      <td className="timestamp-cell">
                        {new Intl.DateTimeFormat("nl-BE", {
                          dateStyle: "medium",
                          timeStyle: "medium",
                        }).format(new Date(submission.submittedAt))}
                      </td>
                      <td className="student-cell">{submission.studentName}</td>
                      <td>
                        <ol className="admin-preferences">
                          {submission.preferences.map((preference, index) => (
                            <li key={preference.branchId}>
                              <span>{index + 1}</span>
                              {snapshot.matrix.branches.find(
                                ({ id }) => id === preference.branchId,
                              )?.name ?? preference.branchId}
                            </li>
                          ))}
                        </ol>
                      </td>
                      <td className="assignment-cell">
                        {combinationName(submission.assignedCombination)}
                      </td>
                      <td>
                        <span
                          className={`assignment-status ${submission.assignedCombination ? "assigned" : "waitlisted"}`}
                        >
                          {submission.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredSubmissions.length === 0 && (
                <div className="empty-results">
                  Geen inschrijvingen gevonden met deze filters.
                </div>
              )}
            </div>
          </section>

          <section className="danger-zone">
            <div>
              <strong>Testinschrijvingen wissen</strong>
              <p>
                Verwijdert alle inschrijvingen en zet alle tellers terug op nul.
              </p>
            </div>
            <button
              type="button"
              className="danger-button"
              onClick={() => void resetAll()}
              disabled={busy}
            >
              <RotateCcw size={15} /> Alles resetten
            </button>
          </section>
        </>
      ) : null}

      <footer className="site-footer">
        <span>
          Branch inschrijving <i /> Beheer
        </span>
        <span>
          <ShieldCheck size={14} /> Beveiligde beheerdersomgeving
        </span>
      </footer>
    </main>
  );
}
