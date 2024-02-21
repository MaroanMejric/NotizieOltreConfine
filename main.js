const schedule = require('node-schedule');
const generalController = require('./generalController');

schedule.scheduleJob('0 8 * * *', () => {                     //ogni giorno alle 8 di mattina esegue la sua routine
    console.log('ROUTINE STARTED AT 08:00');
    generalController.executeRoutineTasks();
});