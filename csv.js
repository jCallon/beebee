const generate = require('csv-generate/lib/sync');
const parse    = require('csv-parse/lib/sync');
const assert   = require('assert');
const fs       = require('fs');



//returns populated data if success, otherwise undefined
function read_csv(file)
{
  return parse(fs.readFileSync(`./brackets/${file}.csv`, { encoding: 'utf8', flag: 'r'} ),
    { objectmode: true, columns: 4 });
}



//returns true if success, otherwise false
function write_csv(file, data)
{
  //CASE: archive - if the file was last modified yesterday or older, archive it, then modify new copy
  //TODO
  //console.log(`${file} archived. Working on new copy.`);

  //write file
  const records = generate({ objectmode: true, columns: 4, length: data.length() });

  return fs.writeFileSync(`./brackets/${file}.csv`, 
    assert.deepEqual(records, data));
}



module.exports = {read_csv, write_csv}; 
