# 📜 DevMetrics Scripts

This directory contains automation scripts for your DevMetrics project.

---

## Available Scripts

### 🐍 `create_github_tasks.py`
**Purpose**: Automatically create GitHub issues and project board from your task specifications

**What it does**:
- ✅ Creates 24 labels (priority, type, category, size, sprint)
- ✅ Creates GitHub issues from task definitions
- ✅ Sets up a project board
- ✅ Links everything together

**Requirements**:
- Python 3.x
- `requests` library: `pip3 install requests`
- GitHub Personal Access Token
- Environment variables set

**Usage**:
```bash
# Set environment variables
export GITHUB_TOKEN="your_token_here"
export GITHUB_OWNER="your_github_username"
export GITHUB_REPO="devmet-app"

# Run the script
python3 scripts/create_github_tasks.py
```

**Features**:
- Flexible task definitions
- Rate limiting built-in
- Error handling
- Progress reporting
- Easily customizable

**Customization**:
Edit the `SPRINT_1_TASKS` array in the script to add more tasks or modify existing ones.

---

### 📝 `create-github-issues.sh` (Bash alternative)
**Purpose**: Shell script for creating GitHub issues using GitHub CLI

**Status**: Requires GitHub CLI (`gh`) to be installed

**Usage**:
```bash
# Install GitHub CLI first
brew install gh

# Authenticate
gh auth login

# Edit script with your details
nano scripts/create-github-issues.sh

# Run it
./scripts/create-github-issues.sh
```

**Note**: Python script is recommended as it doesn't require additional installations.

---

## Quick Start

**Step 1**: Install dependencies
```bash
pip3 install requests
```

**Step 2**: Set up credentials
```bash
# Get token from: https://github.com/settings/tokens
export GITHUB_TOKEN="ghp_your_token_here"
export GITHUB_OWNER="your_username"
```

**Step 3**: Run
```bash
python3 scripts/create_github_tasks.py
```

**Step 4**: Check GitHub
- Issues: `github.com/YOUR_USERNAME/devmet-app/issues`
- Projects: `github.com/YOUR_USERNAME` → Projects tab

---

## Adding More Tasks

### Method 1: Edit the Python script

1. Open `create_github_tasks.py`
2. Find the `SPRINT_1_TASKS` array
3. Add more task dictionaries:

```python
{
    'id': 'TASK-004',
    'title': 'Your Task Name',
    'type': 'feature',  # or chore, enhancement
    'priority': 'P0-Critical',  # or P1-High, P2-Medium, P3-Low
    'category': 'backend',  # or frontend, ai, etc.
    'size': 'M',  # XS, S, M, L, XL
    'sprint': 'Sprint-1',
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
    '''
}
```

4. Run the script again

### Method 2: Create from TASK_SPECIFICATION.md

Copy task details from `TASK_SPECIFICATION.md` and convert to the format above.

---

## Troubleshooting

### "No module named 'requests'"
```bash
pip3 install requests
```

### "Authentication failed"
```bash
# Generate new token: https://github.com/settings/tokens
# Make sure it has 'repo' and 'project' scopes
export GITHUB_TOKEN="new_token_here"
```

### "Repository not found"
```bash
# Verify values
echo $GITHUB_OWNER
echo $GITHUB_REPO

# Fix if wrong
export GITHUB_OWNER="correct_username"
```

### Issues created but no project board
Create manually:
1. Go to github.com/YOUR_USERNAME
2. Click Projects → New Project
3. Name it "DevMetrics Development"
4. Choose "Board" view

---

## Script Features

### Flexibility
- All tasks include a note encouraging modification
- Easy to add/edit/remove tasks
- Labels can be customized

### Safety
- Rate limiting to avoid API limits
- Error handling for failed requests
- Dry-run option (add to script if needed)

### Extensibility
- Easy to add Sprint 2, 3, 4 tasks
- Can create multiple project boards
- Can link to milestones

---

## Examples

### Create Sprint 2 Tasks

Add to the script:

```python
SPRINT_2_TASKS = [
    {
        'id': 'TASK-014',
        'title': 'Implement GitHub OAuth Flow',
        'type': 'feature',
        'priority': 'P0-Critical',
        'category': 'backend',
        'size': 'L',
        'sprint': 'Sprint-2',
        'description': '...'
    },
    # Add more Sprint 2 tasks...
]

# Then in main() function:
for task in SPRINT_2_TASKS:
    title, body, labels = create_task_issue_body(task)
    issue = manager.create_issue(title, body, labels)
    time.sleep(0.5)
```

### Create All Tasks at Once

Convert all 69 tasks from TASK_SPECIFICATION.md to the dictionary format and add them to the script.

---

## Best Practices

1. **Start small**: Run with Sprint 1 first (3 tasks)
2. **Test thoroughly**: Verify issues are created correctly
3. **Customize freely**: Modify task descriptions as needed
4. **Rate limiting**: Keep the `time.sleep()` calls to avoid API limits
5. **Token security**: Never commit your token to git
6. **Regular updates**: Re-run script to add new tasks as needed

---

## Future Enhancements

Possible additions to these scripts:

- [ ] Milestone creation
- [ ] Automatic sprint assignment
- [ ] Issue template support
- [ ] Batch import from CSV
- [ ] Progress tracking
- [ ] Automatic project board column assignment
- [ ] Issue linking based on dependencies

---

## Need Help?

- **Full guide**: `../GITHUB_SETUP_GUIDE.md`
- **Quick checklist**: `../GITHUB_SETUP_CHECKLIST.md`
- **Quick start**: `../SETUP_YOUR_GITHUB.md`

---

**Happy automating!** 🤖

