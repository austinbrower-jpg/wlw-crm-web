"use client";
import { Sparkles, Check, RotateCcw, Database } from "lucide-react";
import { PROBABILITIES, type Workspace } from "@/lib/domain";
import { Button } from "./ui";
export function SettingsView({
  s,
  warning,
  onReset,
}: {
  s: Workspace;
  warning: string | null;
  onReset: () => void;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">A WILD LOGIC PROJECT</div>
          <h1>
            Thoughtfully built<span className="cobalt">.</span>
          </h1>
          <p>
            A practical workspace for the relationships that grow a business.
          </p>
        </div>
      </div>
      <div className="settings-grid">
        <section className="panel settings-card">
          <span className="settings-icon">
            <Sparkles size={23} />
          </span>
          <h2>Useful software. Human details.</h2>
          <p>
            Relay CRM is a portfolio demo for small service teams. Explore the
            pipeline, plan a follow-up, or take a relationship from the first
            hello to a project handoff.
          </p>
          <div className="demo-feature-list">
            <span>
              <Check size={16} />
              12 fictional companies and 24 contacts at first launch
            </span>
            <span>
              <Check size={16} />
              Connected deals, notes, tasks, and activity
            </span>
            <span>
              <Check size={16} />
              CSV imports with a review before anything changes
            </span>
          </div>
          <div className="settings-rule" />
          <h3>Your own little workspace</h3>
          <p>
            Every visitor gets independent data in their browser. There’s no
            account or login. This demo does not provide production
            authentication, team sharing, or multi-tenant security. Use
            fictional information only.
          </p>
        </section>
        <div>
          <section className="panel settings-card">
            <span className="settings-icon">
              <Database size={23} />
            </span>
            <h2>Local demo data</h2>
            <p>
              {warning ??
                "Your changes save automatically in this browser. Clearing site data removes your workspace."}
            </p>
            <dl className="details-list">
              <div>
                <dt>Companies</dt>
                <dd>{s.companies.length}</dd>
              </div>
              <div>
                <dt>Contacts</dt>
                <dd>{s.contacts.length}</dd>
              </div>
              <div>
                <dt>Deals / tasks</dt>
                <dd>
                  {s.deals.length} / {s.tasks.length}
                </dd>
              </div>
              <div>
                <dt>First launched</dt>
                <dd>{new Date(s.firstLaunch).toLocaleDateString("en-US")}</dd>
              </div>
              <div>
                <dt>Currency</dt>
                <dd>USD</dd>
              </div>
            </dl>
            <Button variant="danger" onClick={onReset}>
              <RotateCcw size={15} />
              Reset demo
            </Button>
          </section>
          <section className="panel settings-card metric-definitions">
            <h2>Numbers with context</h2>
            <p>
              <strong>Open pipeline</strong> is the sum of active deals,
              excluding Won and Lost.
            </p>
            <p>
              <strong>Weighted forecast</strong> uses open values × stage
              probabilities:{" "}
              {Object.entries(PROBABILITIES)
                .filter(([st]) => !["Won", "Lost"].includes(st))
                .map(([st, p]) => `${st} ${p * 100}%`)
                .join(", ")}
              .
            </p>
            <p>
              <strong>Won value</strong> uses actual close dates for the
              selected month, or all time. Archived deals are excluded.
            </p>
            <p>
              <strong>Follow-ups due</strong> counts incomplete, active tasks
              due today or earlier, including overdue tasks.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
