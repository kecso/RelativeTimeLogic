/**
 * @author kecso / https://github.com/kecso
 */

//TODO - in the input directory it will load *.in files and generate a single output json file with the data and the associations
//TODO for all input file name it will generate -> filename.ph1 + filename.ph2 + filename.ph3 associations so those should be used in the actual project
var FS = require('fs'),
    inputDir = './src/scripts/inputdir',
    inputNames = FS.readdirSync(inputDir),
    input,
    i, j, k,
    output = {data:{}},
    outputName,
    inputLine,
    inputSize,
    inputOffset;

//for(i=0;i<inputNames.length;i++){
//    input = FS.readFileSync(inputDir+'/'+inputNames[i], 'utf8');
//    input = input.split('\n');
//
//    if(!output.timeLine){
//        inputLine = input[0];
//        inputLine = inputLine.split(',');
//
//        output.timeLine = inputLine;
//    }
//
//    //phase-lines
//    for(j=1;j<4;j++){
//        inputLine = input[j] || [];
//        inputLine = inputLine.split(',');
//        if(inputLine.length === output.timeLine.length){
//            outputName = inputNames[i].slice(0,-4)+'_ph'+j;
//            output.data[outputName] = inputLine;
//        }
//    }
//}

//TODO temporary sized effort
inputSize = 100;
inputOffset = 3950;
for(i=0;i<inputNames.length;i++){
    input = FS.readFileSync(inputDir+'/'+inputNames[i], 'utf8');
    input = input.split('\n');

    if(!output.timeLine){
        inputLine = input[0];
        inputLine = inputLine.split(',');

        output.timeLine = [];
        for(j=0;j<inputSize;j++){
            output.timeLine.push(inputLine[j]);
        }
    }

    //phase-lines
    for(j=1;j<4;j++){
        inputLine = input[j] || [];
        inputLine = inputLine.split(',');
        if(inputLine.length >= inputSize+inputOffset){
            outputName = inputNames[i].slice(0,-4)+'_ph'+j;
            output.data[outputName] = [];
            for(k=inputOffset;k<inputSize+inputOffset;k++){
                output.data[outputName].push(inputLine[k]);
            }
        }
    }
}

FS.writeFileSync('result.json',JSON.stringify(output,null,2));