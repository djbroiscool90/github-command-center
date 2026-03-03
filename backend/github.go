package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

// GitHub API Types

type GitHubUser struct {
	Login       string `json:"login"`
	Name        string `json:"name"`
	AvatarURL   string `json:"avatar_url"`
	Bio         string `json:"bio"`
	Location    string `json:"location"`
	Blog        string `json:"blog"`
	Company     string `json:"company"`
	PublicRepos int    `json:"public_repos"`
	Followers   int    `json:"followers"`
	Following   int    `json:"following"`
	CreatedAt   string `json:"created_at"`
	HTMLURL     string `json:"html_url"`
}

type GitHubPullRequest struct {
	Number     int        `json:"number"`
	Title      string     `json:"title"`
	State      string     `json:"state"`
	Draft      bool       `json:"draft"`
	HTMLURL    string     `json:"html_url"`
	CreatedAt  string     `json:"created_at"`
	UpdatedAt  string     `json:"updated_at"`
	User       GitHubUser `json:"user"`
	Repository struct {
		FullName string `json:"full_name"`
	} `json:"repository"`
	Additions int `json:"additions"`
	Deletions int `json:"deletions"`
	Comments  int `json:"comments"`
}

// GitHubIssue — note the PullRequest field: GitHub sets it to non-null for PRs
type GitHubIssue struct {
	Number     int        `json:"number"`
	Title      string     `json:"title"`
	State      string     `json:"state"`
	HTMLURL    string     `json:"html_url"`
	CreatedAt  string     `json:"created_at"`
	UpdatedAt  string     `json:"updated_at"`
	User       GitHubUser `json:"user"`
	Repository struct {
		FullName string `json:"full_name"`
	} `json:"repository"`
	Labels []struct {
		Name  string `json:"name"`
		Color string `json:"color"`
	} `json:"labels"`
	Comments    int              `json:"comments"`
	PullRequest *json.RawMessage `json:"pull_request"` // nil for issues, non-nil for PRs
}

// GitHubRepository — raw API response
type GitHubRepository struct {
	Name            string `json:"name"`
	FullName        string `json:"full_name"`
	Description     string `json:"description"`
	HTMLURL         string `json:"html_url"`
	StargazersCount int    `json:"stargazers_count"`
	ForksCount      int    `json:"forks_count"`
	OpenIssuesCount int    `json:"open_issues_count"`
	WatchersCount   int    `json:"watchers_count"`
	Language        string `json:"language"`
	UpdatedAt       string `json:"updated_at"`
	PushedAt        string `json:"pushed_at"`
	Private         bool   `json:"private"`
	Fork            bool   `json:"fork"`
	Size            int    `json:"size"`
}

// RepoResponse — normalized response the frontend expects
type RepoResponse struct {
	Name         string `json:"name"`
	FullName     string `json:"full_name"`
	Description  string `json:"description"`
	HTMLURL      string `json:"html_url"`
	Stars        int    `json:"stars"`
	Forks        int    `json:"forks"`
	OpenIssues   int    `json:"open_issues"`
	Watchers     int    `json:"watchers"`
	Language     string `json:"language"`
	UpdatedAt    string `json:"updated_at"`
	PushedAt     string `json:"pushed_at"`
	Private      bool   `json:"private"`
	Contributors int    `json:"contributors"`
	Branches     int    `json:"branches"`
	Tags         int    `json:"tags"`
	CommitsCount int    `json:"commits_count"`
	PageVisits   int    `json:"page_visits"`
}

// GitHubEvent — for the activity feed
type GitHubEvent struct {
	ID        string          `json:"id"`
	Type      string          `json:"type"`
	CreatedAt string          `json:"created_at"`
	Actor     GitHubUser      `json:"actor"`
	Repo      struct {
		Name string `json:"name"`
		URL  string `json:"url"`
	} `json:"repo"`
	Payload json.RawMessage `json:"payload"`
}

// GitHubRateLimit
type GitHubRateLimit struct {
	Resources struct {
		Core struct {
			Limit     int `json:"limit"`
			Remaining int `json:"remaining"`
			Reset     int `json:"reset"`
			Used      int `json:"used"`
		} `json:"core"`
		Search struct {
			Limit     int `json:"limit"`
			Remaining int `json:"remaining"`
			Reset     int `json:"reset"`
		} `json:"search"`
		GraphQL struct {
			Limit     int `json:"limit"`
			Remaining int `json:"remaining"`
			Reset     int `json:"reset"`
		} `json:"graphql"`
	} `json:"resources"`
}

// GitHubNotification
type GitHubNotification struct {
	ID         string `json:"id"`
	Unread     bool   `json:"unread"`
	Reason     string `json:"reason"`
	UpdatedAt  string `json:"updated_at"`
	Subject    struct {
		Title string `json:"title"`
		Type  string `json:"type"`
		URL   string `json:"url"`
	} `json:"subject"`
	Repository struct {
		FullName string `json:"full_name"`
		HTMLURL  string `json:"html_url"`
	} `json:"repository"`
}

// ─── Handlers ────────────────────────────────────────────────────────────────

func getToken(r *http.Request) string {
	token := r.Header.Get("Authorization")
	token = strings.TrimPrefix(token, "token ")
	token = strings.TrimPrefix(token, "Bearer ")
	if token == "" {
		token = os.Getenv("GITHUB_TOKEN")
	}
	return token
}

func handleGitHubUser(w http.ResponseWriter, r *http.Request) {
	token := getToken(r)
	if token == "" {
		http.Error(w, "Missing authorization header", http.StatusUnauthorized)
		return
	}

	user, err := fetchGitHubUser(token)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to fetch user: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func handleGitHubPulls(w http.ResponseWriter, r *http.Request) {
	token := getToken(r)
	if token == "" {
		http.Error(w, "Missing authorization header", http.StatusUnauthorized)
		return
	}

	state := r.URL.Query().Get("state")
	if state == "" {
		state = "open"
	}

	pulls, err := fetchGitHubPulls(token, state)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to fetch PRs: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(pulls)
}

func handleGitHubIssues(w http.ResponseWriter, r *http.Request) {
	token := getToken(r)
	if token == "" {
		http.Error(w, "Missing authorization header", http.StatusUnauthorized)
		return
	}

	filter := r.URL.Query().Get("filter")
	if filter == "" {
		filter = "assigned"
	}

	issues, err := fetchGitHubIssues(token, filter)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to fetch issues: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(issues)
}

func handleGitHubRepos(w http.ResponseWriter, r *http.Request) {
	token := getToken(r)
	if token == "" {
		http.Error(w, "Missing authorization header", http.StatusUnauthorized)
		return
	}

	sort := r.URL.Query().Get("sort")
	if sort == "" {
		sort = "updated"
	}

	repos, err := fetchGitHubRepos(token, sort)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to fetch repos: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(repos)
}

func handleGitHubEvents(w http.ResponseWriter, r *http.Request) {
	token := getToken(r)
	if token == "" {
		http.Error(w, "Missing authorization header", http.StatusUnauthorized)
		return
	}

	events, err := fetchGitHubEvents(token)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to fetch events: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(events)
}

func handleGitHubRateLimit(w http.ResponseWriter, r *http.Request) {
	token := getToken(r)
	if token == "" {
		http.Error(w, "Missing authorization header", http.StatusUnauthorized)
		return
	}

	rateLimit, err := fetchGitHubRateLimit(token)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to fetch rate limit: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rateLimit)
}

func handleGitHubNotifications(w http.ResponseWriter, r *http.Request) {
	token := getToken(r)
	if token == "" {
		http.Error(w, "Missing authorization header", http.StatusUnauthorized)
		return
	}

	notifications, err := fetchGitHubNotifications(token)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to fetch notifications: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(notifications)
}

// ─── GitHub API Calls ─────────────────────────────────────────────────────────

func githubRequest(token, method, url string) (*http.Response, error) {
	req, err := http.NewRequest(method, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "token "+token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	return http.DefaultClient.Do(req)
}

func fetchGitHubUser(token string) (*GitHubUser, error) {
	resp, err := githubRequest(token, "GET", "https://api.github.com/user")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitHub API error %d: %s", resp.StatusCode, string(body))
	}

	var user GitHubUser
	json.NewDecoder(resp.Body).Decode(&user)
	return &user, nil
}

func fetchGitHubPulls(token, state string) ([]GitHubPullRequest, error) {
	// Use search API to get PRs authored by the user — more reliable than /issues filter
	url := fmt.Sprintf("https://api.github.com/search/issues?q=is:pr+author:@me+state:%s&per_page=100", state)
	resp, err := githubRequest(token, "GET", url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitHub API error %d: %s", resp.StatusCode, string(body))
	}

	var searchResult struct {
		Items []struct {
			Number      int        `json:"number"`
			Title       string     `json:"title"`
			State       string     `json:"state"`
			Draft       bool       `json:"draft"`
			HTMLURL     string     `json:"html_url"`
			CreatedAt   string     `json:"created_at"`
			UpdatedAt   string     `json:"updated_at"`
			User        GitHubUser `json:"user"`
			PullRequest *struct {
				URL string `json:"url"`
			} `json:"pull_request"`
			Comments int `json:"comments"`
		} `json:"items"`
	}
	json.NewDecoder(resp.Body).Decode(&searchResult)

	var pulls []GitHubPullRequest
	for _, item := range searchResult.Items {
		// Extract repo from HTMLURL: https://github.com/owner/repo/pull/N
		repoFullName := ""
		parts := strings.Split(item.HTMLURL, "/")
		if len(parts) >= 5 {
			repoFullName = parts[3] + "/" + parts[4]
		}

		pulls = append(pulls, GitHubPullRequest{
			Number:    item.Number,
			Title:     item.Title,
			State:     item.State,
			Draft:     item.Draft,
			HTMLURL:   item.HTMLURL,
			CreatedAt: item.CreatedAt,
			UpdatedAt: item.UpdatedAt,
			User:      item.User,
			Comments:  item.Comments,
			Repository: struct {
				FullName string `json:"full_name"`
			}{FullName: repoFullName},
		})
	}

	if pulls == nil {
		pulls = []GitHubPullRequest{}
	}
	return pulls, nil
}

func fetchGitHubIssues(token, filter string) ([]GitHubIssue, error) {
	var url string
	switch filter {
	case "mentioned":
		url = "https://api.github.com/issues?filter=mentioned&state=open&per_page=100"
	case "created":
		url = "https://api.github.com/issues?filter=created&state=open&per_page=100"
	default:
		url = "https://api.github.com/issues?filter=assigned&state=open&per_page=100"
	}

	resp, err := githubRequest(token, "GET", url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitHub API error %d: %s", resp.StatusCode, string(body))
	}

	var rawIssues []GitHubIssue
	json.NewDecoder(resp.Body).Decode(&rawIssues)

	// Filter out PRs (items with a pull_request field)
	var issues []GitHubIssue
	for _, issue := range rawIssues {
		if issue.PullRequest == nil {
			issues = append(issues, issue)
		}
	}

	if issues == nil {
		issues = []GitHubIssue{}
	}
	return issues, nil
}

func fetchGitHubRepos(token, sort string) ([]RepoResponse, error) {
	apiSort := "updated"
	switch sort {
	case "forks":
		apiSort = "forks"
	case "stars":
		apiSort = "stars"
	case "visits", "recent":
		apiSort = "updated"
	}

	url := fmt.Sprintf("https://api.github.com/user/repos?per_page=100&sort=%s&affiliation=owner,collaborator", apiSort)
	resp, err := githubRequest(token, "GET", url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitHub API error %d: %s", resp.StatusCode, string(body))
	}

	var rawRepos []GitHubRepository
	json.NewDecoder(resp.Body).Decode(&rawRepos)

	// Map to frontend-expected field names
	var repos []RepoResponse
	for _, r := range rawRepos {
		repos = append(repos, RepoResponse{
			Name:         r.Name,
			FullName:     r.FullName,
			Description:  r.Description,
			HTMLURL:      r.HTMLURL,
			Stars:        r.StargazersCount,
			Forks:        r.ForksCount,
			OpenIssues:   r.OpenIssuesCount,
			Watchers:     r.WatchersCount,
			Language:     r.Language,
			UpdatedAt:    r.UpdatedAt,
			PushedAt:     r.PushedAt,
			Private:      r.Private,
			Contributors: 0, // Requires per-repo call; omitted for rate limit reasons
			Branches:     0,
			Tags:         0,
			CommitsCount: 0,
			PageVisits:   0,
		})
	}

	if repos == nil {
		repos = []RepoResponse{}
	}
	return repos, nil
}

func fetchGitHubEvents(token string) ([]GitHubEvent, error) {
	// Get the authenticated user first to build the events URL
	user, err := fetchGitHubUser(token)
	if err != nil {
		return nil, err
	}

	url := fmt.Sprintf("https://api.github.com/users/%s/events?per_page=50", user.Login)
	resp, err := githubRequest(token, "GET", url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitHub API error %d: %s", resp.StatusCode, string(body))
	}

	var events []GitHubEvent
	json.NewDecoder(resp.Body).Decode(&events)

	if events == nil {
		events = []GitHubEvent{}
	}
	return events, nil
}

func fetchGitHubRateLimit(token string) (*GitHubRateLimit, error) {
	resp, err := githubRequest(token, "GET", "https://api.github.com/rate_limit")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitHub API error %d: %s", resp.StatusCode, string(body))
	}

	var rateLimit GitHubRateLimit
	json.NewDecoder(resp.Body).Decode(&rateLimit)
	return &rateLimit, nil
}

func fetchGitHubNotifications(token string) ([]GitHubNotification, error) {
	resp, err := githubRequest(token, "GET", "https://api.github.com/notifications?all=false&per_page=50")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitHub API error %d: %s", resp.StatusCode, string(body))
	}

	var notifications []GitHubNotification
	json.NewDecoder(resp.Body).Decode(&notifications)

	if notifications == nil {
		notifications = []GitHubNotification{}
	}
	return notifications, nil
}
