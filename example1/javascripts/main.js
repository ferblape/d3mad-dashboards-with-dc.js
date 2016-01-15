'use strict';

accounting.settings = {
  currency: {
    symbol: "€",     // default currency symbol is '$'
    format: "%v %s", // controls output: %s = symbol, %v = value/number (can be object: see below)
    decimal: ",",    // decimal point separator
    thousand:  ".",  // thousands separator
    precision: 0     // decimal places
  },
  number: {
    precision: 0,   // default precision on numbers is 0
    decimal: ",",   // decimal point separator
    thousand: ".",  // thousands separator
  }
}

queue()
  .defer(d3.csv, "data/predict2015_short_esp.csv")
  .await(makeGraphs);

var totalDisplay, totalByAgeChart, totalBySexChart, totalByCountryChart;

function makeGraphs(error,data){
  if(error)
    throw(error);

  data = data.filter(function(d){
    return d.destiny === 'España';
  });

  data.forEach(function(d) {
    d.accepted_total = parseInt(d.accepted_total);
    d.rejected_total = parseInt(d.rejected_total);
    d.total = parseInt(d.total);
  });

  var ndx = crossfilter(data);

  //var acceptedTotalDim = ndx.dimension(function(d) {return d.accepted_total;});
  //var rejectedTotalDim = ndx.dimension(function(d) {return d.rejected_total;});

  var ageDim = ndx.dimension(function(d) {return d.age;});
  var sexDim = ndx.dimension(function(d) {return d.sex;});
  var originDim = ndx.dimension(function(d) {return d.origin;});

  var totalGroup = ndx.groupAll().reduceSum(function(d){ return d.total; });
  var totalPerAgeGroup = ageDim.group().reduceSum(function(d){ return d.total; });
  var totalPerSexGroup = sexDim.group().reduceSum(function(d){ return d.total; });
  var totalPerOriginGroup = originDim.group().reduceSum(function(d){ return d.total; });

  totalDisplay = dc.numberDisplay("#total-inmigrants");
  totalBySexChart = dc.pieChart("#total-by-sex");
  totalByAgeChart = dc.rowChart("#total-by-age");
  totalByCountryChart = dc.rowChart("#total-by-country");

  totalDisplay
    .group(totalGroup)
    .valueAccessor(function (p){ return p;})
    .formatNumber(function(d){ return accounting.formatNumber(d, {precision: 0})});

  totalBySexChart
    .dimension(sexDim)
    .group(totalPerSexGroup)
    .label(function(d) {
      var total = d3.sum(totalPerSexGroup.all().map(function(d){ return d.value; }));
      var percentage = (d.value*100 / total);
      return d.key + " " + accounting.formatNumber(percentage, {precision: 1}) + '%';
    })
    .title(function (d) {
      return d.value;
    });

  totalByAgeChart
    .dimension(ageDim)
    .group(totalPerAgeGroup)
    .ordinalColors(['#3182bd', '#6baed6', '#9ecae1', '#c6dbef', '#dadaeb'])
    .elasticX(true)
    .xAxis().ticks(4);

  totalByCountryChart
    .dimension(originDim)
    .group(totalPerOriginGroup)
    .title(function(d) {
      return d.key + " " + accounting.formatNumber(d.value);
    })
    .height(400)
    .data(function(group){
      return group.top(15);
    })
    .elasticX(true)
    .xAxis().ticks(4);

  dc.renderAll();
}


function reset_filters(){
  dc.filterAll();
	dc.redrawAll();
};
