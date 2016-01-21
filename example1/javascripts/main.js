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
    p.totalBudget += v.budget;
    p.totalPopulation += v.population;
    p.totalBudgetPerInhabitant += v.budgetPerInhabitant;

    p.meanBudget = p.totalBudget / p.count;
    p.meanBudgetPerInhabitant = p.totalBudgetPerInhabitant / p.count;

    return p;
  }

  var removeElement = function(p, v){
    p.count--;
    p.totalBudget -= v.budget;
    p.totalPopulation -= v.population;
    p.totalBudgetPerInhabitant -= v.budgetPerInhabitant;

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
  var meanBudgetPerInhabitantPerYearGroup = yearsDim.group().reduce(addElement, removeElement, initialize);

  var autonomousRegionsDim = budgets.dimension(function(d){ return d.autonomous_region; });
  var budgetPerAutonomousRegionGroup = autonomousRegionsDim.group().reduceSum(function(d){ return d.budget; });

  meanBudgetDisplay = dc.numberDisplay("#mean-budget");
  meanBudgetPerInhabitantDisplay = dc.numberDisplay("#mean-budget-per-inhabitant");
  yearsChart = dc.pieChart("#years");
  autonomousRegionsChart = dc.rowChart("#autonomous-regions");
  evolutionChart = dc.lineChart("#evolution");
  //mapChart = dc.geoChoroplethChart("#map");

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
    .title(function(d){
      return d.key;
    })
    .label(function(d){
      return d.key.getFullYear();
    })
    .group(budgetPerYearGroup);

  autonomousRegionsChart
    .dimension(autonomousRegionsDim)
    .group(budgetPerAutonomousRegionGroup)
    .title(function(d) {
      return d.key + " " + accounting.formatNumber(d.value);
    })
    .elasticX(true)
    .height(400)
    .xAxis().ticks(2);

  var values = d3.extent(meanBudgetPerInhabitantPerYearGroup.all().map(function(v){ return v.value.meanBudgetPerInhabitant; }));

  evolutionChart
    .dimension(yearsDim)
    .group(meanBudgetPerInhabitantPerYearGroup)
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
}


function reset_filters(){
  dc.filterAll();
	dc.redrawAll();
};
