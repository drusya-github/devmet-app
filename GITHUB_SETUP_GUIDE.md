# 🚀 GitHub Issues & Project Board Setup Guide

This guide will help you create all your DevMetrics tasks as GitHub issues and organize them in a project board.

---

## 🎯 Quick Start (5 Minutes)

### Step 1: Create a GitHub Personal Access Token

1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Give it a name: `DevMetrics Task Creator`
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `project` (Full control of projects)
5. Click **"Generate token"**
6. **IMPORTANT**: Copy the token immediately (you won't see it again!)

### Step 2: Set Up Your Repository

Make sure you have a GitHub repository for this project:

```bash
# If you haven't created a repo yet:
# 1. Go to https://github.com/new
# 2. Name it: devmet-app
# 3. Make it public or private (your choice)
# 4. Don't initialize with README (you already have one)

# Then link your local repo to GitHub:
cd /Users/chandradrusya/Desktop/devmet-app
git remote add origin https://github.com/YOUR_USERNAME/devmet-app.git
git branch -M main
git add .
git commit -m "Initial commit with task specifications"
git push -u origin main
```

### Step 3: Set Environment Variables

```bash
# Set your GitHub credentials
export GITHUB_TOKEN="your_token_here"  # Paste the token from Step 1
export GITHUB_OWNER="your_github_username"  # Your GitHub username
export GITHUB_REPO="devmet-app"  # Your repo name

# Verify they're set
echo $GITHUB_TOKEN
echo $GITHUB_OWNER
```

### Step 4: Run the Script

```bash
# Navigate to your project
cd /Users/chandradrusya/Desktop/devmet-app

# Run the Python script
python3 scripts/create_github_tasks.py
```

**That's it!** The script will:
- ✅ Create all labels (priorities, types, categories, sizes, sprints)
- ✅ Create Sprint 1 issues (13 tasks)
- ✅ Create a project board
- ✅ Link everything together

---

## 📋 What Gets Created

### Labels (Automatically Created)

**Priority Labels:**
- 🔴 `P0-Critical` - Must complete for MVP
- 🟠 `P1-High` - Important features
- 🟡 `P2-Medium` - Nice to have
- 🟢 `P3-Low` - Future enhancements

**Type Labels:**
- 🔵 `feature` - New functionality
- 🟣 `chore` - Setup/maintenance
- 🔷 `enhancement` - Improvements
- 🔴 `bug` - Bug fixes

**Category Labels:**
- `backend` - Backend development
- `frontend` - Frontend development
- `infrastructure` - DevOps
- `ai` - AI features
- `integration` - Third-party integrations
- `testing` - Tests
- `docs` - Documentation

**Size Labels:**
- `XS` - 1-2 hours
- `S` - 2-4 hours
- `M` - 4-8 hours
- `L` - 1-2 days
- `XL` - 2-5 days

**Sprint Labels:**
- `Sprint-1` - Week 1
- `Sprint-2` - Week 2
- `Sprint-3` - Week 3
- `Sprint-4` - Week 4
- `Backlog` - Future work

### Issues Created (Sprint 1)

The script creates these issues for Sprint 1:
1. [TASK-001] Install and Configure PostgreSQL
2. [TASK-002] Install and Configure Redis
3. [TASK-003] Initialize API Project Structure
... (13 total for Sprint 1)

### Project Board

A project board named **"DevMetrics Development"** with columns:
- 📋 Backlog
- 🏃 Sprint 1
- 🏃 Sprint 2
- 🏃 Sprint 3
- 🏃 Sprint 4
- ⏳ In Progress
- 👀 In Review
- ✅ Done

---

## 🔧 Customizing the Script

### Adding More Sprints

To create issues for Sprint 2, 3, and 4, edit the script:

```python
# In create_github_tasks.py, add to SPRINT_1_TASKS array:

SPRINT_2_TASKS = [
    {
        'id': 'TASK-014',
        'title': 'Implement GitHub OAuth Flow',
        'type': 'feature',
        'priority': 'P0-Critical',
        'category': 'backend',
        'size': 'L',
        'sprint': 'Sprint-2',
        'description': '''... your description ...'''
    },
    # Add more Sprint 2 tasks...
]

# Then in main() function, add:
for task in SPRINT_2_TASKS:
    title, body, labels = create_task_issue_body(task)
    issue = manager.create_issue(title, body, labels)
    if issue:
        manager.created_issues.append(issue)
    time.sleep(0.5)
```

### Modifying Task Templates

Each task in the script has this structure:

```python
{
    'id': 'TASK-XXX',           # Unique identifier
    'title': 'Task Name',        # Short title
    'type': 'feature',           # feature/chore/enhancement
    'priority': 'P0-Critical',   # P0/P1/P2/P3
    'category': 'backend',       # backend/frontend/etc
    'size': 'M',                 # XS/S/M/L/XL
    'sprint': 'Sprint-1',        # Sprint-1/2/3/4/Backlog
    'description': '''
        ## Description
        What needs to be done
        
        ## Acceptance Criteria
        - [ ] Criterion 1
        - [ ] Criterion 2
        
        ## Dependencies
        - TASK-XXX
        
        ## Estimated Time
        X hours
        
        ---
        📝 Feel free to modify this task!
    '''
}
```

---

## 🎨 Setting Up the Project Board

After running the script, organize your project board:

### Option A: Manual Organization (Simple)

1. Go to your repository → **Projects** tab
2. Open "DevMetrics Development"
3. Click **"Add item"** → Select issues
4. Drag issues to appropriate columns
5. Filter by Sprint labels to organize

### Option B: Automation (Advanced)

Set up GitHub Actions to automatically:
- Move issues to "In Progress" when you start working
- Move to "In Review" when you open a PR
- Move to "Done" when PR is merged

Create `.github/workflows/project-automation.yml`:

```yaml
name: Project Board Automation

on:
  issues:
    types: [assigned, closed]
  pull_request:
    types: [opened, closed]

jobs:
  move-cards:
    runs-on: ubuntu-latest
    steps:
      - name: Move assigned issues to In Progress
        if: github.event_name == 'issues' && github.event.action == 'assigned'
        uses: alex-page/github-project-automation-plus@v0.8.3
        with:
          project: DevMetrics Development
          column: In Progress
          repo-token: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Move closed issues to Done
        if: github.event_name == 'issues' && github.event.action == 'closed'
        uses: alex-page/github-project-automation-plus@v0.8.3
        with:
          project: DevMetrics Development
          column: Done
          repo-token: ${{ secrets.GITHUB_TOKEN }}
```

---

## 📊 Workflow Tips

### Daily Workflow

```bash
# Morning: Check your board
# https://github.com/YOUR_USERNAME/devmet-app/projects

# Pick a task from current sprint
# Assign it to yourself (moves to "In Progress")

# Work on the task
# Make commits as you go

# When done:
# - Check off all acceptance criteria
# - Close the issue
# - It automatically moves to "Done"
```

### Weekly Review

At the end of each week:
1. Review completed tasks in "Done" column
2. Move unfinished tasks to next sprint if needed
3. Adjust priorities based on progress
4. Celebrate wins! 🎉

---

## 🔄 Making Tasks Flexible

All tasks include a note: **"Feel free to modify this task!"**

### When to Modify a Task

**Add more criteria** if you think of something:
```markdown
## Additional Acceptance Criteria
- [ ] New requirement you thought of
- [ ] Better approach discovered
```

**Simplify** if it's too complex:
```markdown
## Simplified Approach
Instead of X, we'll do Y because...
```

**Split** if it's too large:
```markdown
## This task has been split into:
- #XXX - Part 1
- #XXX - Part 2
```

**Link related work**:
```markdown
## Related
- Depends on #XXX
- Blocked by #XXX
- Related to #XXX
```

### Using GitHub Issue Features

**Comments**: Add progress updates
```markdown
### Progress Update
- ✅ Set up basic structure
- ⏳ Working on authentication
- 🚧 Blocked by API rate limit issue
```

**Task Lists**: Check off criteria as you complete them

**Labels**: Add/remove as needed

**Milestones**: Group issues into milestones (sprints)

**Assignees**: Assign to yourself

**Projects**: Link to multiple projects if needed

---

## 🚨 Troubleshooting

### "Authentication failed"

**Problem**: Token is invalid or expired

**Solution**:
```bash
# Generate a new token
# https://github.com/settings/tokens

# Re-export the variable
export GITHUB_TOKEN="new_token_here"
```

### "Repository not found"

**Problem**: Repo doesn't exist or wrong name

**Solution**:
```bash
# Check your repo exists
# https://github.com/YOUR_USERNAME/devmet-app

# Verify environment variables
echo $GITHUB_OWNER
echo $GITHUB_REPO

# Update if wrong
export GITHUB_OWNER="correct_username"
export GITHUB_REPO="correct_repo_name"
```

### "Rate limit exceeded"

**Problem**: Too many API requests

**Solution**:
```bash
# Wait 60 minutes, or

# Increase the sleep time in the script
# Change: time.sleep(0.5)
# To: time.sleep(2.0)
```

### "Project creation failed"

**Problem**: Projects V2 API might need different permissions

**Solution**:
1. Manually create the project board:
   - Go to Projects tab → New Project
   - Name it "DevMetrics Development"
   - Choose "Board" view
2. The issues will still be created
3. Manually add issues to the board

---

## 🎯 Alternative: Manual Issue Creation

If the script doesn't work, you can create issues manually:

### Quick Template

For each task in `TASK_SPECIFICATION.md`:

1. Go to **Issues** → **New Issue**
2. Title: `[TASK-XXX] Task Name`
3. Copy the task description and acceptance criteria
4. Add labels: priority, type, category, size, sprint
5. Click **Create issue**

### Bulk Creation with GitHub CLI (Alternative)

If you can install GitHub CLI later:

```bash
# Install (after fixing permissions)
brew install gh

# Authenticate
gh auth login

# Create issues from template
gh issue create --title "[TASK-001] Install PostgreSQL" \
  --body-file task-001.md \
  --label "P0-Critical,chore,infrastructure,S,Sprint-1"
```

---

## 📝 Best Practices

### Issue Management

✅ **DO**:
- Keep issue descriptions clear and concise
- Update status regularly
- Link related issues
- Use checklists for acceptance criteria
- Add comments for progress updates
- Close issues when complete

❌ **DON'T**:
- Let issues go stale
- Forget to update labels
- Skip documentation
- Leave issues open when done

### Project Board

✅ **DO**:
- Review board daily
- Keep columns organized
- Archive completed sprints
- Use filters effectively
- Update regularly

❌ **DON'T**:
- Let it get cluttered
- Forget to move cards
- Ignore blocked items
- Skip retrospectives

---

## 🎉 You're All Set!

### Quick Reference

```bash
# 1. Get token
# → https://github.com/settings/tokens

# 2. Set variables
export GITHUB_TOKEN="your_token"
export GITHUB_OWNER="your_username"

# 3. Run script
python3 scripts/create_github_tasks.py

# 4. View results
# → https://github.com/YOUR_USERNAME/devmet-app/issues
# → https://github.com/YOUR_USERNAME/devmet-app/projects
```

### Next Steps

1. ✅ Run the setup script
2. ✅ Review created issues
3. ✅ Organize project board
4. ✅ Start with TASK-001!

---

**Happy coding!** 🚀

*Remember: These tasks are flexible! Modify them as you learn and discover better approaches.*

