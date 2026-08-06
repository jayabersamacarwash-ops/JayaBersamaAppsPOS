import fs from 'fs'

const content = fs.readFileSync('supabase/migrate.js', 'utf-8')
const lines = content.split('\n')
lines.forEach((line, index) => {
  if (line.includes('cashflow') || line.includes('insertInBatches')) {
    console.log(`L${index+1}: ${line.trim()}`)
  }
})
