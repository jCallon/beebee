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
function write_csv(file, data, archive)
{
  const file_name = `./brackets/${file}.csv`;

  //CASE: archive - if the file was last modified >= 24 hours ago archive it, then modify new copy
  //TODO not tested
  if(archive === true)
  {
    const old_date = fs.fstatSync(file_name, (err, stats) => { return stats.ctime });

    if((new Date().getTime() - old_date.getTime()) > 86400000)
    {
      fs.renameSync(file_name, 
        `./brackets/archive/${file}_${old_data.toDateString().replaceAll(' ','_')}.csv`);
      console.log(`${file} archived. Working on new copy.`);
    }
  }

  //write file
  const records = generate({ objectmode: true, columns: 4, length: data.length() });

  return fs.writeFileSync(`./brackets/${file}.csv`, 
    assert.deepEqual(records, data));
}



module.exports = {read_csv, write_csv}; 
