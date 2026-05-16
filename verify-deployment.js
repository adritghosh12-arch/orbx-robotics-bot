#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying deployment readiness...\n');

const requiredFiles = [
  'package.json',
  'next.config.js',
  'vercel.json',
  '.nvmrc',
  'styles/Forum.module.css',
  'styles/Home.module.css',
  'styles/Chat.module.css',
  'styles/Auth.module.css',
  'styles/About.module.css',
  'styles/Dashboard.module.css',
  'styles/ForumThread.module.css',
  'lib/db.js',
  'lib/rag-chain.js',
  'lib/auth.js',
  'lib/guardrails.js'
];

let allGood = true;

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING!`);
    allGood = false;
  }
});

console.log('\n🔧 Checking Node.js version...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (packageJson.engines && packageJson.engines.node) {
  console.log(`✅ Node.js version specified: ${packageJson.engines.node}`);
} else {
  console.log('❌ Node.js version not specified in package.json');
  allGood = false;
}

console.log('\n📋 Environment variables needed:');
console.log('- DATABASE_URL (required for runtime)');
console.log('- JWT_SECRET (required)');
console.log('- GROQ_API_KEY (required)');
console.log('- GROQ_MODEL (optional)');
console.log('- NEXT_PUBLIC_API_URL (optional)');

if (allGood) {
  console.log('\n🎉 All required files present! Ready for Vercel deployment.');
  console.log('💡 Make sure to set environment variables in Vercel dashboard.');
} else {
  console.log('\n⚠️  Some files are missing. Please check the errors above.');
  process.exit(1);
}