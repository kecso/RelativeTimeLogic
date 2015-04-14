/**
 * @author kecso / https://github.com/kecso
 */
var inputPath = './src/examples/1ph2g.json',
    input = JSON.parse(require('fs').readFileSync(inputPath,'utf8')),
    analyze = {},
    i,j,
    min,
    max,
    values,
    ids,
    data;

ids = Object.keys(input.data || {});
for(i=0;i<ids.length;i++){
    analyze[ids[i]] = {};
    values = [];
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
    }
    analyze[ids[i]].min = min;
    analyze[ids[i]].max = max;
    analyze[ids[i]].values = values;
}
console.log(analyze);