const fs        = require('fs');
const stringify = require('csv-stringify');
const parse     = require('csv-parse/lib/sync');
//const assert    = require('assert');



//returns populated data if success, otherwise undefined
function read_csv(file)
{
  try
  {
    return parse(fs.readFileSync(`./brackets/${file}.csv`),
      { header: true, columns: true });
  }
  catch(e)
  {
    return undefined;
  }
}



//returns 0 if success, otherwise 1
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
  try
  {
    stringify(data, 
      { header: true },
      (err, out) => fs.writeFileSync(`./brackets/${file}.csv`, out));
    return 0; //good, all went well
  }
  catch(e)
  {
    console.log(e);
    return 1; //bad, there was an error
  }
}



module.exports = {read_csv, write_csv}; 
