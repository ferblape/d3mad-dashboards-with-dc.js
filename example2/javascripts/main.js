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

var totalDisplay, acceptedByAgeChart, acceptedBySexChart, acceptedByCountryChart,
    rejectedByAgeChart, rejectedBySexChart, rejectedByCountryChart,
    acceptedDisplay, rejectedDisplay;

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

  var ageDim = ndx.dimension(function(d) {return d.age;});
  var sexDim = ndx.dimension(function(d) {return d.sex;});
  var originDim = ndx.dimension(function(d) {return d.origin;});

  var totalGroup = ndx.groupAll().reduceSum(function(d){ return d.total; });
  var acceptedGroup = ndx.groupAll().reduceSum(function(d){ return d.accepted_total; });
  var rejectedGroup = ndx.groupAll().reduceSum(function(d){ return d.rejected_total; });
  var acceptedPerAgeGroup = ageDim.group().reduceSum(function(d){ return d.accepted_total; });
  var acceptedPerSexGroup = sexDim.group().reduceSum(function(d){ return d.accepted_total; });
  var acceptedPerOriginGroup = originDim.group().reduceSum(function(d){ return d.accepted_total; });
  var rejectedPerAgeGroup = ageDim.group().reduceSum(function(d){ return d.rejected_total; });
  var rejectedPerSexGroup = sexDim.group().reduceSum(function(d){ return d.rejected_total; });
  var rejectedPerOriginGroup = originDim.group().reduceSum(function(d){ return d.rejected_total; });

  totalDisplay = dc.numberDisplay("#total-inmigrants");
  acceptedDisplay = dc.numberDisplay("#accepted");
  rejectedDisplay = dc.numberDisplay("#rejected");
  acceptedBySexChart = dc.pieChart("#accepted-by-sex");
  acceptedByAgeChart = dc.rowChart("#accepted-by-age");
  acceptedByCountryChart = dc.rowChart("#accepted-by-country");
  rejectedBySexChart = dc.pieChart("#rejected-by-sex");
  rejectedByAgeChart = dc.rowChart("#rejected-by-age");
  rejectedByCountryChart = dc.rowChart("#rejected-by-country");

  totalDisplay
    .group(totalGroup)
    .valueAccessor(function (p){ return p;})
    .formatNumber(function(d){ return accounting.formatNumber(d, {precision: 0})});

  acceptedDisplay
    .group(acceptedGroup)
    .valueAccessor(function (p){ return p;})
    .formatNumber(function(d){
      var total = totalGroup.value();
      var percentage = (d*100/total);
      return accounting.formatNumber(d, {precision: 0}) + " (" + accounting.formatNumber(percentage, {precision: 1}) + "%)"; 
    });

  rejectedDisplay
    .group(rejectedGroup)
    .valueAccessor(function (p){ return p;})
    .formatNumber(function(d){
      var total = totalGroup.value();
      var percentage = (d*100/total);
      return accounting.formatNumber(d, {precision: 0}) + " (" + accounting.formatNumber(percentage, {precision: 1}) + "%)"; 
    });

  acceptedBySexChart
    .dimension(sexDim)
    .group(acceptedPerSexGroup)
    .label(function(d) {
      var total = d3.sum(acceptedPerSexGroup.all().map(function(d){ return d.value; }));
      var percentage = (d.value*100 / total);
      return d.key + " " + accounting.formatNumber(percentage, {precision: 1}) + '%';
    })
    .title(function (d) {
      return d.value;
    });

  acceptedByAgeChart
    .dimension(ageDim)
    .group(acceptedPerAgeGroup)
    .ordinalColors(['#3182bd', '#6baed6', '#9ecae1', '#c6dbef', '#dadaeb'])
    .elasticX(true)
    .xAxis().ticks(4);

  acceptedByCountryChart
    .dimension(originDim)
    .group(acceptedPerOriginGroup)
    .title(function(d) {
      return d.key + " " + accounting.formatNumber(d.value);
    })
    .height(400)
    .data(function(group){
      return group.top(15);
    })
    .elasticX(true)
    .xAxis().ticks(4);

  rejectedBySexChart
    .dimension(sexDim)
    .group(rejectedPerSexGroup)
    .label(function(d) {
      var total = d3.sum(rejectedPerSexGroup.all().map(function(d){ return d.value; }));
      var percentage = (d.value*100 / total);
      return d.key + " " + accounting.formatNumber(percentage, {precision: 1}) + '%';
    })
    .title(function (d) {
      return d.value;
    });

  rejectedByAgeChart
    .dimension(ageDim)
    .group(rejectedPerAgeGroup)
    .ordinalColors(['#3182bd', '#6baed6', '#9ecae1', '#c6dbef', '#dadaeb'])
    .elasticX(true)
    .xAxis().ticks(4);

  rejectedByCountryChart
    .dimension(originDim)
    .group(rejectedPerOriginGroup)
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
