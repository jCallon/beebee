const generate = require('csv-generate');
const parse    = require('csv-parse');



function read_csv(file)
{
  let data = undefined;

  let tmp = [];
  await fs.createReadStream(`brackets/${file}.csv`)
    .pipe({parse({ delimeter: ',' })
    .on('data',  r  => { tmp.push(r); })
    .on('error', e  => { console.log(`Error reading ${file}.csv.`); })
    .on('end',   () => { data = tmp; });

  return data;
}



function write_csv(file, data)
{
  //CASE: archive - if the file was last modified yesterday or older, archive it, then modify new copy
  //TODO
  //console.log(`${file} archived. Working on new copy.`);

  //write file
  await fs.createWriteStream(`brackets/${file}.csv`)
    .pipe({generate({ delimeter: ',' })
    .on('data',  r  => { tmp.push(r); })
    .on('error', e  => { console.log(`Error writing ${file}.csv.`); })
    .on('end',   () => { data = tmp; });

  return data;

  return true;
}



module.exports = {read_csv, write_csv}; 
