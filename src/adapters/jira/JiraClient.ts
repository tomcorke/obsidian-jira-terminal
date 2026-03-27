/**
 * JiraClient - HTTP client for Jira REST API.
 *
 * Uses curl via child_process rather than Obsidian's requestUrl because
 * requestUrl goes through Electron's network stack which may not respect
 * VPN proxy settings, causing 403 errors on Jira Cloud instances that
 * require VPN/IP allowlisting.
 */
import type { JiraIssue, JiraStatus, JiraIssueType } from "./types";

interface JiraTransition {
  id: string;
  name: string;
  to: { name: string };
}

export class JiraClient {
  baseUrl: string;
  username: string;
  private token: string | null = null;

  constructor(baseUrl: string, username: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.username = username;
  }

  private getExecSync(): typeof import("child_process").execSync {
    return ((window as any).require("child_process") as typeof import("child_process")).execSync;
  }

  private getToken(): string {
    if (this.token) return this.token;

    const execSync = this.getExecSync();
    try {
      this.token = execSync('security find-generic-password -s "Atlassian API Token" -w', {
        encoding: "utf8",
      }).trim();
    } catch {
      throw new Error(
        "Jira API token not found in Keychain. " +
          'Add it: security add-generic-password -s "Atlassian API Token" -a "<label>" -w "<token>"',
      );
    }

    if (!this.username) {
      try {
        this.username = execSync('security find-generic-password -s "Atlassian Username" -w', {
          encoding: "utf8",
        }).trim();
      } catch {
        throw new Error(
          "Jira username not configured and not found in Keychain. " +
            "Set it in plugin settings or add: " +
            'security add-generic-password -s "Atlassian Username" -a "atlassian" -w "<email>"',
        );
      }
    }

    return this.token;
  }

  /**
   * Make an HTTP request via curl. Returns parsed JSON.
   */
  private curlJson(method: string, url: string, body?: string): any {
    const token = this.getToken();
    const execSync = this.getExecSync();

    const args = [
      "curl",
      "-s",
      "-X",
      method,
      "-H",
      "Accept: application/json",
      "-H",
      "Content-Type: application/json",
      "-u",
      `${this.username}:${token}`,
      "-w",
      "\\n__HTTP_STATUS:%{http_code}",
    ];

    if (body) {
      args.push("-d", body);
    }

    args.push(url);

    // Build shell-safe command
    const cmd = args.map((a) => `'${a.replace(/'/g, "'\\''")}'`).join(" ");
    const result = execSync(cmd, { encoding: "utf8", timeout: 30000 });

    const statusMatch = result.match(/__HTTP_STATUS:(\d+)/);
    const httpStatus = statusMatch ? parseInt(statusMatch[1], 10) : 0;
    const responseBody = result.replace(/\n__HTTP_STATUS:\d+$/, "").trim();

    if (httpStatus >= 400) {
      const err = new Error(`Jira API ${method} ${url} failed: HTTP ${httpStatus}`);
      (err as any).status = httpStatus;
      (err as any).body = responseBody;
      throw err;
    }

    if (!responseBody || httpStatus === 204) return {};
    return JSON.parse(responseBody);
  }

  /**
   * Fetch issues for a specific board via the Agile API.
   * This scopes results to only issues on the board.
   */
  async getBoardIssues(boardId: string, maxResults = 50): Promise<JiraIssue[]> {
    const jql = encodeURIComponent("status != Done ORDER BY Rank ASC");
    const fields =
      "summary,status,issuetype,assignee,priority,labels,customfield_10020,customfield_10041,parent,created,updated";
    const url = `${this.baseUrl}/rest/agile/1.0/board/${boardId}/issue?jql=${jql}&maxResults=${maxResults}&fields=${fields}`;

    const data = this.curlJson("GET", url);

    return (data.issues || []).map((issue: any, index: number) => this.parseIssue(issue, index));
  }

  async searchIssues(jql: string, maxResults = 50): Promise<JiraIssue[]> {
    const body = JSON.stringify({
      jql,
      maxResults,
      fields: [
        "summary",
        "status",
        "issuetype",
        "assignee",
        "priority",
        "labels",
        "customfield_10020",
        "customfield_10041",
        "parent",
        "created",
        "updated",
      ],
    });

    const data = this.curlJson("POST", `${this.baseUrl}/rest/api/3/search/jql`, body);

    return (data.issues || []).map((issue: any, index: number) => this.parseIssue(issue, index));
  }

  async getIssue(key: string): Promise<JiraIssue> {
    const data = this.curlJson("GET", `${this.baseUrl}/rest/api/3/issue/${key}`);
    return this.parseIssue(data, 0);
  }

  async getTransitions(key: string): Promise<JiraTransition[]> {
    const data = this.curlJson("GET", `${this.baseUrl}/rest/api/3/issue/${key}/transitions`);
    return data.transitions || [];
  }

  async transitionIssue(key: string, transitionId: string): Promise<void> {
    this.curlJson(
      "POST",
      `${this.baseUrl}/rest/api/3/issue/${key}/transitions`,
      JSON.stringify({ transition: { id: transitionId } }),
    );
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
