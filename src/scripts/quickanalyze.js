/**
 * @author kecso / https://github.com/kecso
 */
var inputPath = './src/examples/delayed.json',
    input = JSON.parse(require('fs').readFileSync(inputPath,'utf8')),
    analyze = {},
    i,j,
    min,
    max,
    values,
    ids,
    data,
    zeroes,zeroCount;

ids = Object.keys(input.data || {});
for(i=0;i<ids.length;i++){
    analyze[ids[i]] = {};
    values = [];
    zeroes = [];
    zeroCount = 0;
    min = Number(input.data[ids[i]][0]);
    max = min;
    for(j=0;j<input.data[ids[i]].length;j++){
        data = Number(input.data[ids[i]][j]);
        if(data > max){
            max = data;
        }

        if(data < min){
            min = data;
        }
        if(values.indexOf(data) === -1){
            values.push(data)
        }
        if(data > 1){
            if(zeroCount > 0){
                zeroes.push(zeroCount);
                zeroCount = 0;
            }
        } else {
            zeroCount++;
        }

    }
    analyze[ids[i]].min = min;
    analyze[ids[i]].max = max;
    analyze[ids[i]].values = values;
    analyze[ids[i]].zeroes = zeroes;
}
console.log(analyze);