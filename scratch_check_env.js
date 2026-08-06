import fs from 'fs'

const content = fs.readFileSync('JB.env', 'utf-8')
content.split(/\r?\n/).forEach(line => {
  if (line.trim().startsWith('#') || !line.includes('=')) return
  const [key, ...val] = line.split('=')
  console.log(`Key: ${key.trim()} is present, length: ${val.join('=').trim().length}`)
})
