d3.csv('https://raw.githubusercontent.com/ferblape/d3mad-dashboards-with-dc.js/gh-pages/datasets/presupuestos-municipales.csv', function(error, data){
  data.forEach(function(d){
    d.budget = +d.budget;
    d.population = +d.population;
    d.year = +d.year;
    d.budgetPerInhabitant = (d.budget / d.population);
  });

  var budgets = crossfilter(data);

  var budgetDim = budgets.dimension(function(d){ return d.budget; });
  var populationDim = budgets.dimension(function(d){ return d.population; });
  var budgetPerInhabitantDim = budgets.dimension(function(d){ return d.budgetPerInhabitant; });

  console.log(budgetDim.top(3));
  console.log(populationDim.top(3));
  console.log(budgetPerInhabitantDim.top(3));

});

