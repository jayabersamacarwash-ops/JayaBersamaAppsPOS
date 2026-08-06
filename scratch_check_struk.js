import fs from 'fs'

const content = fs.readFileSync('supabase/migrate.cjs', 'utf-8')
const lines = content.split('\n')
lines.forEach((line, index) => {
  if (line.includes('mappedStruk') || (index >= 240 && index <= 300)) {
    console.log(`L${index+1}: ${line.trim()}`)
  }
})
