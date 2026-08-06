import fs from 'fs'

function findQueries(file) {
  const content = fs.readFileSync(file, 'utf-8')
  console.log(`=== QUERIES IN ${file} ===`)
  
  // Find all supabase.from(...) calls
  const regex = /from\(['"]([^'"]+)['"]\)/g
  let match
  while ((match = regex.exec(content)) !== null) {
    console.log(`Table: "${match[1]}" at index ${match.index}`)
  }
}

findQueries('src/pages/Dashboard.jsx')
findQueries('src/pages/CarwashQueue.jsx')
findQueries('src/pages/Finance.jsx')
