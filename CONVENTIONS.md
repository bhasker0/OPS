# CONVENTIONS.md


<skills_system priority="1">

## Available Skills

<!-- SKILLS_TABLE_START -->
<usage>
When users ask you to perform tasks, check if any of the available skills
below can help complete the task more effectively.

How to use skills:
- Invoke: Bash("skilz read <skill-name> --agent aider")
- The skill content will load with detailed instructions
- Base directory provided in output for resolving bundled resources

Step-by-step process:
1. Identify a skill from <available_skills> that matches the user's request
2. Run the command above to load the skill's SKILL.md content
3. Follow the instructions in the loaded skill content
4. Skills may include bundled scripts, templates, and references

Usage notes:
- Only use skills listed in <available_skills> below
- Do not invoke a skill that is already loaded in your context
</usage>

<available_skills>

<skill>
<name>jira-main</name>
<description>Manages JIRA issues, projects, and workflows using Atlassian MCP. Use when asked to "create JIRA ticket", "search JIRA", "update JIRA issue", "transition issue", "sprint planning", or "epic management".</description>
<location>.skilz/skills/jira-main/SKILL.md</location>
</skill>

</available_skills>
<!-- SKILLS_TABLE_END -->

</skills_system>
