# AGENTS.md


<skills_system priority="1">

## Available Skills

<!-- SKILLS_TABLE_START -->
<usage>
When users ask you to perform tasks, check if any of the available skills
below can help complete the task more effectively.

How to use skills:
- Invoke: Bash("skilz read <skill-name> --agent universal")
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
<name>jira</name>
<description>Manages JIRA issues, projects, and workflows using Atlassian MCP. Use when asked to "create JIRA ticket", "search JIRA", "update JIRA issue", "transition issue", "sprint planning", or "epic management".</description>
<location>.agent/skills/jira/SKILL.md</location>
</skill>

<skill>
<name>karpathy-guidelines</name>
<description>Behavioral guidelines to reduce common LLM coding mistakes. Use when writing, reviewing, or refactoring code to avoid overcomplication, make surgical changes, surface assumptions, and define verifiable success criteria.</description>
<location>.agent/skills/karpathy-guidelines/SKILL.md</location>
</skill>

<skill>
<name>ops-operations-guide</name>
<description>Expert workflow and coding standards for the OPS SaaS Super Admin platform (Express, Prisma, PostgreSQL, MongoDB, React).</description>
<location>.agent/skills/ops-operations-guide/SKILL.md</location>
</skill>

<skill>
<name>minimalist-ui</name>
<description>Clean editorial-style interfaces. Warm monochrome palette, typographic contrast, flat bento grids, muted pastels. No gradients, no heavy shadows.</description>
<location>.agent/skills/minimalist-skill/SKILL.md</location>
</skill>

<skill>
<name>redesign-existing-projects</name>
<description>Upgrades existing websites and apps to premium quality. Audits current design, identifies generic AI patterns, and applies high-end design standards without breaking functionality. Works with any CSS framework or vanilla CSS.</description>
<location>.agent/skills/redesign-skill/SKILL.md</location>
</skill>

</available_skills>
<!-- SKILLS_TABLE_END -->

</skills_system>
