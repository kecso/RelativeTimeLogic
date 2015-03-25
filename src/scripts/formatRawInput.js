/**
 * @author kecso / https://github.com/kecso
 */


//create a two dimensional array from the raw input ans saves it as a json object serialization

var FS = require('fs'),
    inputName = 'Ibus1',
    input = FS.readFileSync(inputName+'.txt', 'utf8'),
    i, j,
    output = [],
    outputLine = [],
    inputLine,
    dataSize;

input = input.split('\n');

if(input.length < 1){
    throw new Error('no data in input');
}

dataSize = (input[0].split(',')).length;
for (i = 0; i < input.length; i++) {
    inputLine = input[i];
    inputLine = inputLine.split(',');
    outputLine = [];
    if(inputLine.length === dataSize){
        for(j=0;j</*inputLine.length*/100;j++){
            if(Number(inputLine[j]) === 'NaN'){
                throw new Error('invalid input format!!!',i,j);
            } else {
                outputLine.push(Number(inputLine[j]));
            }
        }
        output.push(outputLine);

    } else {
        console.log('line '+i+' have been dropped, due to data size difference: expected '+dataSize+', got '+inputLine.length);
    }
}

FS.writeFileSync(inputName+'.format.json',JSON.stringify(output));