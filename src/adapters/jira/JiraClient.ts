/**
 * JiraClient - HTTP client for Jira REST API using Obsidian's requestUrl.
 * Reads credentials from macOS Keychain.
 */
import { requestUrl } from "obsidian";
import type { JiraIssue, JiraStatus, JiraIssueType } from "./types";

interface JiraTransition {
  id: string;
  name: string;
  to: { name: string };
}

export class JiraClient {
  private baseUrl: string;
  private username: string;
  private token: string | null = null;

  constructor(baseUrl: string, username: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.username = username;
  }

  private async getToken(): Promise<string> {
    if (this.token) return this.token;

    // Read from macOS Keychain
    const { execSync } = (window as any).require("child_process") as typeof import("child_process");
    try {
      this.token = execSync(
        `security find-generic-password -s "Atlassian API Token" -a "${this.username}" -w`,
        { encoding: "utf8" }
      ).trim();
    } catch {
      throw new Error(
        `Jira API token not found in Keychain for "${this.username}". ` +
        `Add it: security add-generic-password -s "Atlassian API Token" -a "<email>" -w "<token>"`
      );
    }
    return this.token;
  }

  private async authHeader(): Promise<string> {
    const token = await this.getToken();
    const encoded = btoa(`${this.username}:${token}`);
    return `Basic ${encoded}`;
  }

  async searchIssues(jql: string, maxResults = 50): Promise<JiraIssue[]> {
    const auth = await this.authHeader();
    const resp = await requestUrl({
      url: `${this.baseUrl}/rest/api/3/search/jql`,
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ jql, maxResults, fields: [
        "summary", "status", "issuetype", "assignee", "priority",
        "labels", "customfield_10020", "customfield_10041",
        "parent", "created", "updated",
      ]}),
    });

    const data = resp.json;
    return (data.issues || []).map((issue: any, index: number) =>
      this.parseIssue(issue, index)
    );
  }

  async getIssue(key: string): Promise<JiraIssue> {
    const auth = await this.authHeader();
    const resp = await requestUrl({
      url: `${this.baseUrl}/rest/api/3/issue/${key}`,
      method: "GET",
      headers: {
        Authorization: auth,
        Accept: "application/json",
      },
    });
    return this.parseIssue(resp.json, 0);
  }

  async getTransitions(key: string): Promise<JiraTransition[]> {
    const auth = await this.authHeader();
    const resp = await requestUrl({
      url: `${this.baseUrl}/rest/api/3/issue/${key}/transitions`,
      method: "GET",
      headers: {
        Authorization: auth,
        Accept: "application/json",
      },
    });
    return resp.json.transitions || [];
  }

  async transitionIssue(key: string, transitionId: string): Promise<void> {
    const auth = await this.authHeader();
    await requestUrl({
      url: `${this.baseUrl}/rest/api/3/issue/${key}/transitions`,
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ transition: { id: transitionId } }),
    });
  }

  private parseIssue(raw: any, index: number): JiraIssue {
    const fields = raw.fields || {};
    const sprint = this.extractSprint(fields.customfield_10020);

    return {
      key: raw.key || "",
      summary: fields.summary || "",
      status: (fields.status?.name || "New") as JiraStatus,
      issueType: (fields.issuetype?.name || "Task") as JiraIssueType,
      assignee: fields.assignee?.displayName || "",
      assigneeAccountId: fields.assignee?.accountId || "",
      priority: fields.priority?.name || "Medium",
      labels: fields.labels || [],
      sprint,
      storyPoints: fields.customfield_10041 || 0,
      parentKey: fields.parent?.key || "",
      created: fields.created || "",
      updated: fields.updated || "",
      url: `${this.baseUrl}/browse/${raw.key}`,
      rank: index,
    };
  }

  private extractSprint(sprintField: any): string {
    if (!sprintField) return "";
    // Sprint field can be an array of sprint objects
    if (Array.isArray(sprintField)) {
      const active = sprintField.find((s: any) => s.state === "active");
      return active?.name || sprintField[0]?.name || "";
    }
    if (typeof sprintField === "object" && sprintField.name) {
      return sprintField.name;
    }
    return "";
  }
}
