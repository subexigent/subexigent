let fs = require('fs-extra')
let path = require('path')
let fileStore = path.join(process.cwd(), 'fileStore')

fs.remove(fileStore)
  .then(() => {
    fs.ensureDirSync(fileStore)
  })