const fs = require('fs');
const { write_csv } = require('./csv.js');

const max_participants   = 50; //helps with file size and seed sanity
const max_handle_length  = 20; //helps with file size and displaying
const max_bracket_length = 30; //helps with file name sanity
const max_brackets       = 30; //helps with file number sanity
const archive = false;   //use this to have a backup copy of each day
const bot_owner = 'Kit'; //people can contact you for special requests

//raise or lower the rng factor to your liking, higher will make win rates matter less
//but DON'T make it 0, or that will break the choosing alrogithm
const rng_fac = 0.1;
const set_fac = 1.0 - rng_fac;

class User
{
  constructor(handle)
  {
    this.handle = handle;
    this.status = 'active';
    this.wins   = 0;
    this.losses = 0;
  }
}

class Resp{
  conststructor(message, code)
  {
    this.code    = code;    //integer (0 for failure or 1 for success) to tell caller function
    this.message = message; //string to tell user
  }
}

//all commands:
//take - the arguments file, data, and arg, even if they do not use them
//return - Resp
//with the exception of create, 
//  are run after validating the csv, so they don't need to do so themselves
const cmd = new Map();
cmd.set('-create',  cmd_create );
cmd.set('-delete',  omitted_cmd);
cmd.set('-modify',  omitted_cmd);
cmd.set('-display', cmd_display);
cmd.set('-join',    cmd_join   );
cmd.set('-leave',   omitted_cmd);
cmd.set('-pause',   cmd_pause  );
cmd.set('-unpause', cmd_unpause);
cmd.set('-win',     cmd_win    );
cmd.set('-lose',    cmd_lose   );
cmd.set('-seed',    cmd_seed   );



function cmd_create(file, data, arg)
{
  //CASE: user enterred bracket name longer than max_bracket_length - abort and tell user
  if(arg.length() > max_bracket_length)
    return Resp(1, `Your bracket name exceeds the ${max_bracket_length} character limit.\nShorten the name, or if that's not practical, ask the bot owner, ${bot_owner}, to increase the limit.`);

  //CASE: file already exists - abort and tell user
  if(fs.existsSync(`./bracket/${file}.csv`) === true)
    return Resp(1, `Bracket ${file} already exists.`);

  //CASE: max_brackets have been reached - abort and tell user
  if(fs.readdirSync('./bracket/', (err, files) => { return files.length; }) >= max_brackets)
    return Resp(1, `At max bracket count ${max_brackets}. Ask the bot owner, ${bot_owner} to increase the max or archive old brackets.`);

  //create file, it will be a userless bracket until joined
  const resp = cmd_join(file, [], arg);

  if(resp.code === 1)
    return resp.message;

  return Resp(0, `Bracket ${file} with participant ${arg} created.`);
}



//cmd_delete is intentionally omitted
//
//function cmd_delete(file, data, arg)
//{
//}



//cmd_modify is intentionally omitted
//
//function cmd_modify(file, data, arg)
//{
//}



//could be optimized, but this is easy to read and understand
function cmd_display(file, data, arg)
{
  let message = '';
  let max_column_length = 
  [
    6, //String('HANDLE').length(),
    6, //String('STATUS').length(),
    4, //String('WINS').  length(),
    6, //String('LOSSES').length()
  ];
  let handle_length, status_length, wins_length, losses_length;

  for(user of data)
  {
    handle_length = user.handle.length();
    status_length = user.status.length();
    win_length    = user.wins.toString().length();
    losses_length = user.losses.toString().length();

    if(handle_length > max_col_length[0]) max_col_length[0] = handle_length;
    if(status_length > max_col_length[1]) max_col_length[1] = status_length;
    if(wins_length   > max_col_length[2]) max_col_length[2] = wins_length;
    if(losses_length > max_col_length[3]) max_col_length[3] = losses_length;

    user.winrate = user.wins / (user.wins + user.losses);
  }

  message.append(
    String('HANDLE').padEnd(max_col_length[0], ' ') + ' ' +
    String('STATUS').padEnd(max_col_length[1], ' ') + ' ' +
    String('WINS').  padEnd(max_col_length[2], ' ') + ' ' +
    String('LOSSES').padEnd(max_col_length[3], ' ') + ' ' +
    'WINRATE'
  );

  for(user of data)
    message.append(
      user.handle           .padEnd(max_col_length[0], ' ') + ' ' +
      user.status           .padEnd(max_col_length[1], ' ') + ' ' +
      user.wins  .toString().padEnd(max_col_length[2], ' ') + ' ' +
      user.losses.toString().padEnd(max_col_length[3], ' ') + ' ' +
      user.winrate.toFixed(3)
    );

  return Resp(0, `\`\`\`${message}\`\`\``);
}



function cmd_join(file, data, arg)
{
  //CASE: the bracket has reached max_participants - abort and tell user
  if(data.length() >= max_participants)
    return Resp(1, `The max number of participants, ${max_participants}, for the bracket has been reached.\nIf you feel you should be in, ask the bot owner, ${bot_owner}, to increase the max or find chronocally inactive participants to kick.`);

  //CASE: user enterred handle name longer than max_handle_length - abort and tell user
  if(arg.length() > max_handle_length)
    return Resp(1, `The handle name exceeds the ${max_handle_length} max character limit.\nShorten the handle, or if that's not practical, ask the bot owner, ${bot_owner}, to increase the limit.`);

  //CASE: user is already in bracket - tell them and do nothing
  if(data.findIndex(user => user.handle === arg) !== -1)
    return Resp(1, `${user} is already participating in bracket ${file}.`);

  //append the user
  data.append(new User(arg));
  write_csv(file, data, archive);
  return Resp(0, `${user} is now participating in bracket ${file}.`);
}



function cmd_pause(file, data, arg)
{
  //CASE: user is not in bracket - tell them and do nothing
  if(data.findIndex(user => user.handle === arg) === -1)
    return Resp(1, `${user} is not participating in bracket ${file}.`);

  //CASE: user is already paused
  if(data.find(user => user.handle === arg).status === 'away')
    return Resp(1, `${user} is already paused.`);

  //pause user
  data.find(user => user.handle === arg).status = 'away';
  write_csv(file, data, archive);
  return Resp(0, `${user} paused.`);
}



function cmd_unpause(file, data, arg)
{
  //CASE: user is not in bracket - tell them and do nothing
  if(data.findIndex(user => user.handle === arg) === -1)
    return Resp(1, `${user} is not participating in bracket ${file}.`);

  //CASE: user is already paused
  if(data.find(user => user.handle === arg).status === 'active')
    return Resp(1, `${user} is already unpaused.`);

  //unpause user
  data.find(user => user.handle === arg).status = 'active';
  write_csv(file, data, archive);
  return Resp(0, `${user} unpaused.`);
}



function cmd_win(file, data, arg)
{
  //CASE: user is not in bracket - tell them and do nothing
  if(data.findIndex(user => user.handle === arg) === -1)
    return Resp(1, `${user} is not participating in bracket ${file}.`);

  //increment wins on user
  ++data.find(user => user.handle === arg).wins;
  write_csv(file, data, archive);
  return Resp(0, `${user} now has one more win.`);
}



function cmd_lose(file, data, arg)
{
  //CASE: user is not in bracket - tell them and do nothing
  if(data.findIndex(user => user.handle === arg) === -1)
    return Resp(1, `${user} is not participating in bracket ${file}.`);

  //increment losses on user
  ++data.find(user => user.handle === arg).losses;
  write_csv(file, data, archive);
  return Resp(0, `${user} now has one more loss.`);
}



function cmd_seed(file, data, arg)
{
  for(const user of data)
  {
    //CASE: participant has 0 wins or losses, which would break normal division calculation
    if(user.losses === 0 && user.wins === 0){ user.ratio = (set_fac*0.5)+rng_fac; continue; }
    else if(user.wins === 0){                 user.ratio = (set_fac*0.0)+rng_fac; continue; }
    else if(user.losses === 0){               user.ratio = (set_fac*1.0)+rng_fac; continue; }

    user.ratio = (set_fac*(user.wins / (user.wins + user.losses))) + rng_fac;
  }

  //choose your fighter
  switch(arg)
  {
    case 'no_rng':   data = sort_no_rng(data);   break;
    case 'some_rng': data = sort_some_rng(data); break;
    case 'pure_rng': data = sort_pure_rng(data); break;
    default: 
      return Resp(1, `RNG level not recognised. Your options are no_rng, some_rng, or pure_rng.`);
      break;
  }

  const length = data.length();
  for(let i = 0; i < length; i +=2)
    message.append(`${data[i].handle} - ${i + 1 < length ? data[i+1].handle : '???'}\n`);

  return Resp(0, `\`\`\`${message}\`\`\``);
}



//
// Helpers
//



function omitted_cmd(file, data, arg)
{
  return `That operation is left out easy reach intentionally. Ask the bot owner, ${bot_owner}, to do it.`;
}



function sort_no_rng(data)
{
  data.sort((user_1, user_2) => user_1.ratio - user_2.ratio);
  return data;
}



function sort_some_rng(data)
{
  let user_ratio_total = 0.0;
  for(user of data)
    user_ratio_total += user.ratio;

  let user_index = 0;
  let list = [];
  let length = data.length();

  for(let run = 0; run < length; ++run)
  {
    //users with higher win ratios are more likely to get picked next (as they subtract more),
    //inducing some kind of order
    for(let rng = Math.random() % user_ratio_total, user_index = 0;
      rng > user.ratio;
      rng -= user.ratio, ++user_index);

    user_ratio_total -= data[user_index].ratio;

    list.append(data[user_index]);
    data.splice(user_index, 1);
  }

  return list;
}



function sort_pure_rng(data)
{
  let rng = undefined;
  let list = [];
  let length = data.length();

  for(let i = 0; i < length; ++i)
  {
    rng = Math.random() % data.length();
    list.append(data[rng]);
    data.splice(rng, 1);
  }

  return list;
}



/*
//can be optimized by first modding by the total of user's ratios then doing the minus stuff
function sort_some_rng(data)
{
  let rng = undefined;
  let list = [];
  let length = data.length();
  let user_index = 0;
  let num_available_users = length;

  for(let i = 0; i < length; ++i)
  {
    rng = Math.Random() % (max_entrants * 7);

    while(rng > 0.0)
    {
      ++user_index;
      user_index %= num_available_users;

      //users with higher win ratios are more likely to get picked next (as they subtract more),
      //inducing some kind of order
      rng -= user.ratio;
    }
    --num_available_users;

    list.append(data[user_index]);
    data.splice(user_index, 1);
  }

  return list;
}
*/

module.exports = cmd;
