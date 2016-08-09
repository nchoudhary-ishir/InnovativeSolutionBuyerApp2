angular.module('orderCloud')
	.config(HomeConfig)
	.controller('HomeCtrl', HomeController)

;

function HomeConfig($stateProvider) {
	$stateProvider
		.state('home', {
			parent: 'base',
			url: '/home',
			templateUrl: 'home/templates/home.tpl.html',
			controller: 'HomeCtrl',
			controllerAs: 'home',
			resolve: {
				Parameters: function($stateParams, OrderCloudParameters) {
					return OrderCloudParameters.Get($stateParams);
				},
				ProductList : function(OrderCloud, Parameters) {
					return OrderCloud.Me.ListProducts(Parameters.search, Parameters.page, Parameters.pageSize || 12, Parameters.searchOn, Parameters.sortBy, Parameters.filters,Parameters.from, Parameters.to);
				}
			}
		})
	;
}

function HomeController(ProductList) {
	var vm = this;
	vm.list=ProductList;
}
