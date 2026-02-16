#!/usr/bin/env node

/**
 * Connect a skill to the project
 * Usage: node scripts/connect-skill.js <skill-name>
 * 
 * This creates a symlink/copy of the skill to .qwen/skills/
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SKILLS_SOURCE = path.join(__dirname, '..', '_tools');
const SKILLS_DEST = path.join(__dirname, '..', '.qwen', 'skills');
const INDEX_FILE = path.join(SKILLS_SOURCE, 'skills_index.json');

function loadSkillsIndex() {
  try {
    const data = fs.readFileSync(INDEX_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error loading skills index:', err.message);
    return [];
  }
}

function findSkill(skillName) {
  const skills = loadSkillsIndex();
  return skills.find(s => s.id === skillName || s.name === skillName);
}

function copyFolderRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // Skip large data/benchmark folders
    if (entry.name === 'benchmarks' || entry.name === '__pycache__') {
      continue;
    }

    if (entry.isDirectory()) {
      copyFolderRecursive(srcPath, destPath);
    } else {
      // Skip very large files
      const stats = fs.statSync(srcPath);
      if (stats.size > 5 * 1024 * 1024) { // 5MB limit
        continue;
      }
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function connectSkill(skillName) {
  // Ensure destination exists
  if (!fs.existsSync(SKILLS_DEST)) {
    fs.mkdirSync(SKILLS_DEST, { recursive: true });
  }

  const skill = findSkill(skillName);
  
  if (!skill) {
    console.error(`❌ Skill "${skillName}" not found.`);
    console.log('\n💡 Run "node scripts/list-skills.js" to see available skills');
    process.exit(1);
  }

  // Skill path is relative to _tools directory (e.g., "skills/brainstorming")
  const skillPath = path.join(SKILLS_SOURCE, skill.path);
  const destPath = path.join(SKILLS_DEST, skill.id);

  if (!fs.existsSync(skillPath)) {
    console.error(`❌ Skill folder not found: ${skillPath}`);
    process.exit(1);
  }

  if (fs.existsSync(destPath)) {
    console.log(`⚠️  Skill "${skill.id}" already connected. Removing old version...`);
    fs.rmSync(destPath, { recursive: true, force: true });
  }

  console.log(`📦 Connecting skill: ${skill.id}`);
  console.log(`   Source: ${skill.path}`);
  console.log(`   Description: ${skill.description?.slice(0, 100)}...`);
  
  copyFolderRecursive(skillPath, destPath);
  
  console.log(`✅ Skill "${skill.id}" connected successfully!`);
  console.log(`\n💡 Use "@${skill.id}" in your AI chat to activate this skill`);
}

// Main
const skillName = process.argv[2];

if (!skillName) {
  console.log('❌ Please specify a skill name');
  console.log('\nUsage: node scripts/connect-skill.js <skill-name>');
  console.log('\nExamples:');
  console.log('  node scripts/connect-skill.js brainstorming');
  console.log('  node scripts/connect-skill.js frontend-design');
  console.log('  node scripts/connect-skill.js tdd-workflow');
  console.log('\n💡 Run "node scripts/list-skills.js" to see all available skills');
  process.exit(1);
}

connectSkill(skillName);
