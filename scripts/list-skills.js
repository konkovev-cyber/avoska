#!/usr/bin/env node

/**
 * List available skills from _tools/skills directory
 * Usage: node scripts/list-skills.js [search]
 */

const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(__dirname, '..', '_tools');
const INDEX_FILE = path.join(SKILLS_DIR, 'skills_index.json');

function loadSkillsIndex() {
  try {
    const data = fs.readFileSync(INDEX_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error loading skills index:', err.message);
    return [];
  }
}

function getCategories(skills) {
  const categories = {};
  skills.forEach(skill => {
    const cat = skill.category || 'uncategorized';
    if (!categories[cat]) {
      categories[cat] = [];
    }
    categories[cat].push(skill);
  });
  return categories;
}

function formatSkill(skill) {
  const id = skill.id || skill.name;
  const desc = skill.description || 'No description';
  const truncated = desc.length > 80 ? desc.slice(0, 77) + '...' : desc;
  return `  @${id.padEnd(40)} ${truncated}`;
}

function listSkills(searchTerm) {
  const skills = loadSkillsIndex();
  
  if (!skills.length) {
    console.log('No skills found. Make sure _tools/skills is populated.');
    return;
  }

  let filtered = skills;
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = skills.filter(s => 
      (s.name && s.name.toLowerCase().includes(term)) ||
      (s.description && s.description.toLowerCase().includes(term)) ||
      (s.id && s.id.toLowerCase().includes(term))
    );
  }

  if (filtered.length === 0) {
    console.log(`No skills found matching "${searchTerm}"`);
    return;
  }

  console.log(`\n📚 Available Skills${searchTerm ? ` (filtered by "${searchTerm}")` : ''}`);
  console.log(`Total: ${filtered.length} skill(s)\n`);
  console.log('Usage: @skill-name your request\n');
  console.log('─'.repeat(80));

  const categories = getCategories(filtered);
  
  Object.entries(categories)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([category, categorySkills]) => {
      console.log(`\n📁 ${category.toUpperCase()}`);
      console.log('─'.repeat(40));
      categorySkills.forEach(skill => {
        console.log(formatSkill(skill));
      });
    });

  console.log('\n' + '═'.repeat(80));
  console.log(`💡 Tip: Use "@skill-name" in your AI chat to activate a skill`);
}

// Main
const searchTerm = process.argv[2];
listSkills(searchTerm);
