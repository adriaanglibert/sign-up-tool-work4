"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import type {
  Preference,
  PublicMatrix,
  Settings,
  Submission,
} from "@/lib/types";

type Snapshot = { matrix: PublicMatrix; settings: Settings };

async function getError(response: Response): Promise<string> {
  const body = await response.json().catch(() => ({}));
  return typeof body.error === "string"
    ? body.error
    : "Er liep iets mis. Probeer opnieuw.";
}

function preferenceKey(preference: Preference | null): string {
  return preference?.branchId ?? "";
}

export function StudentRegistration() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [studentName, setStudentName] = useState("");
  const [preferences, setPreferences] = useState<Array<Preference | null>>([
    null,
    null,
    null,
  ]);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function refreshOverview() {
    try {
      const response = await fetch("/api/overview", { cache: "no-store" });
      if (!response.ok)
        throw new Error("Het inschrijvingsformulier kon niet worden geladen.");
      setSnapshot((await response.json()) as Snapshot);
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Het inschrijvingsformulier kon niet worden geladen.",
      );
    }
  }

  useEffect(() => {
    const initialRequest = window.setTimeout(() => void refreshOverview(), 0);
    const interval = window.setInterval(() => void refreshOverview(), 15000);
    return () => {
      window.clearTimeout(initialRequest);
      window.clearInterval(interval);
    };
  }, []);

  function updatePreference(index: number, value: string) {
    setPreferences((current) =>
      current.map((preference, slot) =>
        slot === index ? (value ? { branchId: value } : null) : preference,
      ),
    );
    setError("");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (preferences.some((preference) => preference === null)) {
      setError("Kies alle drie je Branchvoorkeuren.");
      return;
    }
    const chosen = preferences as [Preference, Preference, Preference];
    if (new Set(chosen.map(preferenceKey)).size !== 3) {
      setError("Kies drie verschillende Branches.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentName, preferences: chosen }),
      });
      if (!response.ok) throw new Error(await getError(response));
      const body = (await response.json()) as { submission: Submission };
      setSubmission(body.submission);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Je inschrijving kon niet worden verzonden.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="registration-page">
      {!snapshot ? (
        <div className="loading-state">
          <LoaderCircle className="spin" size={20} /> Laden…
        </div>
      ) : submission ? (
        <section className="confirmation" aria-live="polite">
          <div className="confirmation-icon">
            <Check size={23} aria-hidden="true" />
          </div>
          <p className="eyebrow">
            <span className="eyebrow-line" /> INSCHRIJVING ONTVANGEN
          </p>
          <h2>Goed ontvangen</h2>
          <p className="confirm-subtitle">
            Je wordt via Canvas ingedeeld. We laten via een aankondiging weten
            wanneer de indeling bekend is.
          </p>
          <div className="confirmation-details">
            <h3>Jouw voorkeuren</h3>
            <ol className="preference-summary">
              {submission.preferences.map((preference, index) => (
                <li key={preferenceKey(preference)}>
                  <span>{index + 1}</span>
                  <strong>
                    {snapshot.matrix.branches.find(
                      ({ id }) => id === preference.branchId,
                    )?.name ?? preference.branchId}
                  </strong>
                </li>
              ))}
            </ol>
          </div>
          <p className="screenshot-note">
            Je kan een screenshot van dit overzicht maken om het te bewaren.
          </p>
        </section>
      ) : (
        <section className="form-section registration-card">
          <div className="registration-card-heading">
            <h1>Selecteer je voorkeur branches voor @work4</h1>
          </div>
          {!snapshot.settings.isOpen ? (
            <div className="closed-notice">
              <LockKeyhole size={21} />
              <div>
                <strong>Inschrijvingen gesloten</strong>
                <p>Je kan momenteel geen nieuwe inschrijving indienen.</p>
              </div>
            </div>
          ) : (
            <form className="registration-form" onSubmit={submit}>
              <label className="field-label" htmlFor="student-name">
                Volledige naam <span>*</span>
              </label>
              <input
                id="student-name"
                name="studentName"
                autoComplete="name"
                maxLength={120}
                required
                value={studentName}
                onChange={(event) => setStudentName(event.target.value)}
                placeholder="Voornaam en familienaam"
              />
              <p className="field-text">
                Je heeft hier je voorkeuren voor de branches van @work4. Kies
                drie verschillende branches in volgorde van voorkeur.
                Afhankelijk van de beschikbaarheid en je voorkeuren, word je
                ingedeeld bij een van de branches. Je kan je voorkeuren maar één
                keer indienen.
              </p>
              <div className="preference-fields">
                {preferences.map((preference, index) => (
                  <label className="preference-field" key={index}>
                    <span className={`preference-number number-${index + 1}`}>
                      {index + 1}
                    </span>
                    <span className="preference-label">
                      Voorkeur {index + 1}
                      <i>*</i>
                    </span>
                    <span className="select-wrap">
                      <select
                        required
                        aria-label={`Voorkeur ${index + 1}`}
                        value={preferenceKey(preference)}
                        onChange={(event) =>
                          updatePreference(index, event.target.value)
                        }
                      >
                        <option value="">Kies een Branch</option>
                        {snapshot.matrix.branches.map((branch) => (
                          <option
                            key={branch.id}
                            value={branch.id}
                            disabled={preferences.some(
                              (chosen, chosenIndex) =>
                                chosenIndex !== index &&
                                preferenceKey(chosen) === branch.id,
                            )}
                          >
                            {branch.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} aria-hidden="true" />
                    </span>
                  </label>
                ))}
              </div>
              {error && (
                <p className="form-message error-message" role="alert">
                  {error}
                </p>
              )}
              <button
                className="submit-button student-submit-button"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <LoaderCircle size={17} className="spin" /> Voorkeuren
                    doorsturen…
                  </>
                ) : (
                  <>
                    Voorkeuren doorsturen <ArrowRight size={17} />
                  </>
                )}
              </button>
              <p className="privacy-note">
                <ShieldCheck size={14} aria-hidden="true" /> Je gegevens worden
                alleen gebruikt voor deze toewijzing.
              </p>
            </form>
          )}
        </section>
      )}
    </main>
  );
}
