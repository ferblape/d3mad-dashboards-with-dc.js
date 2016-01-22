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
  .defer(d3.csv, "https://raw.githubusercontent.com/ferblape/d3mad-dashboards-with-dc.js/gh-pages/datasets/presupuestos-municipales.csv")
  .await(makeGraphs);

var meanBudgetDisplay, meanBudgetPerInhabitantDisplay, yearsChart, autonomousRegionsChart,
    evolutionChart, mapChart;

function makeGraphs(error,data){
  if(error)
    throw(error);

  data.forEach(function(d){
    d.budget = +d.budget;
    d.population = +d.population;
    d.year = +d.year;
    d.date = new Date(d.year, 0, 1);
    d.budgetPerInhabitant = (d.budget / d.population);
  });

  var budgets = crossfilter(data);

  var addElement = function(p, v){
    p.count++;
    p.totalBudget += v.budget || 0;
    p.totalPopulation += v.population || 0;
    p.totalBudgetPerInhabitant += v.budgetPerInhabitant || 0;

    p.meanBudget = p.totalBudget / p.count;
    p.meanBudgetPerInhabitant = p.totalBudgetPerInhabitant / p.count;

    return p;
  }

  var removeElement = function(p, v){
    p.count--;
    p.totalBudget -= v.budget || 0;
    p.totalPopulation -= v.population || 0;
    p.totalBudgetPerInhabitant -= v.budgetPerInhabitant || 0;

    p.meanBudget = p.totalBudget / p.count;
    p.meanBudgetPerInhabitant = p.totalBudgetPerInhabitant / p.count;

    return p;
  }

  var initialize = function(){
    return {
      count: 0,
      totalBudget: 0,
      totalPopulation: 0,
      totalBudgetPerInhabitant: 0,
      meanBudget: 0,
      meanBudgetPerInhabitant: 0
    };
  }

  var meanBudgetGroup = budgets.groupAll().reduce(addElement, removeElement, initialize);
  var meanBudgetPerInhabitantGroup = budgets.groupAll().reduce(addElement, removeElement, initialize);

  var yearsDim = budgets.dimension(function(d){ return d.date; });
  var budgetPerYearGroup = yearsDim.group().reduceSum(function(d){ return d.budget; });
  var meanBudgetPerYearGroup = yearsDim.group().reduce(addElement, removeElement, initialize);

  var autonomousRegionsDim = budgets.dimension(function(d){ return d.autonomous_region; });
  var budgetPerAutonomousRegionGroup = autonomousRegionsDim.group().reduceSum(function(d){ return d.budget; });

  var provinceDim = budgets.dimension(function(d){ return d.province; });
  var budgetPerProvinceGroup = provinceDim.group().reduce(addElement, removeElement, initialize);

  meanBudgetDisplay = dc.numberDisplay("#mean-budget");
  meanBudgetPerInhabitantDisplay = dc.numberDisplay("#mean-budget-per-inhabitant");
  yearsChart = dc.pieChart("#years");
  autonomousRegionsChart = dc.rowChart("#autonomous-regions");
  evolutionChart = dc.lineChart("#evolution");
  mapChart = dc.geoChoroplethChart("#map");

  d3.json("provinces_carto.geojson", function(error, json){
    if (error) return console.error(error);

    var colors = ["#d75231", "#ec8b66", "#fcdbc8", "#eff3ff", "#a0cae0", "#4893c4", "#022977"];

    mapChart
      .height(450)
      .colors(colors)
      .dimension(provinceDim)
      .group(budgetPerProvinceGroup)
      .valueAccessor(function(d){
        return d.value.meanBudgetPerInhabitant;
      })
      .overlayGeoJson(json.features, "provinces", function(p){
        return p.properties.nombre99;
      })
      .on('preRender', function(chart, filter){
        var mapColors = d3.scale
          .quantize()
          .domain(d3.extent(chart.group().all().map(function(d){ return d.value.meanBudgetPerInhabitant; })))
          .range(colors);

        chart
          .colors(mapColors)
          .colorCalculator(function(d){ return (d !== undefined) ? mapColors(d) : '#ccc'; });
      })
      .on('preRedraw', function(chart, filter){
        var mapColors = d3.scale
          .quantize()
          .domain(d3.extent(chart.group().all().map(function(d){ return d.value.meanBudgetPerInhabitant; })))
          .range(colors);

        chart
          .colors(mapColors)
          .colorCalculator(function(d){ return (d !== undefined) ? mapColors(d) : '#ccc'; });
      })
      .on('renderlet', function(){
        if(d3.select("#map-legend svg")[0][0] !== null) {
          var e = document.getElementById('map-legend');
          e.innerHTML = '';
        }

        var mapColors = d3.scale
          .quantize()
          .domain(d3.extent(mapChart.group().all().map(function(d){ return d.value.meanBudgetPerInhabitant; })))
          .range(colors);

        var svg = d3.select("#map-legend")
          .append("svg")
          .attr('width',500);

        svg.append("g")
          .attr("class", "legendLinear");

        var legendLinear = d3.legend.color()
          .shapeWidth(40)
          .cells(mapColors.domain())
          .orient('vertical')
          .labelFormat(function(v){
            return accounting.formatNumber(v, {precision: 0});
          })
          .scale(mapColors);

        svg.select(".legendLinear")
          .call(legendLinear);
      })
      .title(function(d) {
        return d.key + " " + accounting.formatNumber(d.value);
      });

    var projection = d3.geo.mercator()
      .scale(2000)
      .center([0, 38.8]);

    mapChart.projection(projection);


    meanBudgetDisplay
      .group(meanBudgetGroup)
      .valueAccessor(function (p){ return p.meanBudget;})
      .formatNumber(function(d){ return accounting.formatNumber(d / 1000000, {precision: 0}) + 'M€';});

    meanBudgetPerInhabitantDisplay
      .group(meanBudgetPerInhabitantGroup)
      .valueAccessor(function (p){ return p.meanBudgetPerInhabitant;})
      .formatNumber(function(d){ return accounting.formatNumber(d, {precision: 2}) + '€';});

    yearsChart
      .dimension(yearsDim)
      .group(budgetPerYearGroup)
      .title(function(d){
        return accounting.formatNumber(d.value, {precision: 0}) + '€';
      })
      .label(function(d){
        return d.key.getFullYear();
      });

    autonomousRegionsChart
      .dimension(autonomousRegionsDim)
      .group(budgetPerAutonomousRegionGroup)
      .title(function(d) {
        return d.key + " " + accounting.formatNumber(d.value);
      })
      .elasticX(true)
      .height(400)
      .xAxis().ticks(2);

    var values = d3.extent(meanBudgetPerYearGroup.all().map(function(v){ return v.value.meanBudgetPerInhabitant; }));

    evolutionChart
      .dimension(yearsDim)
      .group(meanBudgetPerYearGroup)
      .margins({top: 50, right: 50, bottom: 25, left: 90})
      .x(d3.time.scale().domain([new Date(2010, 0, 1), new Date(2015, 0, 1)]))
      .valueAccessor(function(d) {
        return d.value.meanBudgetPerInhabitant;
      })
      .yAxisPadding(150)
      .title(function(d) {
        return d.key + " " + accounting.formatNumber(d.value);
      })
      .title(function(d) {
        return d.key + " " + accounting.formatNumber(d.value);
      })
      .height(250)
      .elasticY(true)
      .yAxis()
      .tickFormat(function(v){return accounting.formatNumber(v, {precision: 0}) + '€';});

    dc.renderAll();
  })
}


function reset_filters(){
  dc.filterAll();
	dc.redrawAll();
};
