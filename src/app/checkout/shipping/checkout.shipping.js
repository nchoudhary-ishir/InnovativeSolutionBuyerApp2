angular.module('orderCloud')
	.config(checkoutShippingConfig)
	.controller('CheckoutShippingCtrl', CheckoutShippingController)
    .factory('OrderShippingAddress', OrderShippingAddressFactory)
;

function checkoutShippingConfig($stateProvider) {
	$stateProvider
		.state('checkout.shipping', {
			url: '/shipping',
			templateUrl: 'checkout/shipping/templates/checkout.shipping.tpl.html',
			controller: 'CheckoutShippingCtrl',
			controllerAs: 'checkoutShipping',
			data: { componentName: 'Registration' }
		})
    ;
}

//function CheckoutShippingController($state,$stateParams, $rootScope, OrderCloud, OrderShippingAddress) {
function CheckoutShippingController($state, $stateParams, $rootScope, OrderCloud, OrderShippingAddress, $exceptionHandler, toastr, LoginService) {
	var vm = this;
    vm.saveAddress = null;
    vm.isAlsoBilling = null;
    vm.address = {};
    vm.SaveShippingAddress = saveShipAddress;
    vm.SaveCustomAddress = saveCustomAddress;
    vm.customShipping = false;
    vm.shippingAddress = null;
    //.............Added by Ankit
    vm.user = { Active: true };
    vm.credentials = {
        Username: null,
        Password: null
    };
    vm.token = $stateParams.token;
    vm.form = vm.token ? 'reset' : 'login';
    vm.loginFormHeaders = {
        'login': 'Login',
        'forgot': 'Forgot Password',
        'verificationCodeSuccess': 'Forgot Password',
        'reset': 'Reset Password',
        'resetSuccess': 'Reset Password'
    };
    vm.setForm = function (form) {
        vm.form = form;
    };
    vm.register = function () {
        debugger;
        vm.user.TermsAccepted = new Date();
        OrderCloud.Me.CreateFromTempUser(vm.user, OrderCloud.Auth.ReadToken())
            .then(function (token) {
                OrderCloud.Auth.SetToken(token.access_token);
                $state.go('checkout.shipping', {}, { reload: true });
                toastr.success('Registration Successful', 'Success');
            })
            .catch(function (ex) {
                $exceptionHandler(ex)
            });
    };
    vm.login = function () {
        var tempUserToken = angular.copy(OrderCloud.Auth.ReadToken());
        OrderCloud.Auth.GetToken(vm.credentials)
            .then(function (data) {
                OrderCloud.Auth.SetToken(data['access_token']);
                OrderCloud.Orders.TransferTempUserOrder(tempUserToken)
                    .then(function (data) {
                        console.log(data);
                    })
                    .finally(function () {
                        $state.go('checkout.shipping', {}, { reload: true });
                    });
            })
            .catch(function (ex) {
                $exceptionHandler(ex);
            });
    };

    vm.forgotPassword = function () {
        LoginService.SendVerificationCode(vm.credentials.Email)
            .then(function () {
                vm.setForm('verificationCodeSuccess');
                vm.credentials.Email = null;
            })
            .catch(function (ex) {
                $exceptionHandler(ex);
            });
    };

    vm.resetPassword = function () {
        LoginService.ResetPassword(vm.credentials, vm.token)
            .then(function () {
                vm.setForm('resetSuccess');
                vm.token = null;
                vm.credentials.ResetUsername = null;
                vm.credentials.NewPassword = null;
                vm.credentials.ConfirmPassword = null;
            })
            .catch(function (ex) {
                $exceptionHandler(ex);
                vm.credentials.ResetUsername = null;
                vm.credentials.NewPassword = null;
                vm.credentials.ConfirmPassword = null;
            });
    };
    //............

    function saveShipAddress(order) {
        if (order && order.ShippingAddressID) {
            OrderShippingAddress.Set(order.ShippingAddressID);
            OrderCloud.Addresses.Get(order.ShippingAddressID)
                .then(function(address) {
                    OrderCloud.Orders.Patch(order.ID, {ShippingAddressID: address.ID})
                        .then(function() {
                            $rootScope.$broadcast('OrderShippingAddressChanged', order, address);
                        });
                });
        }
    }

    function saveCustomAddress(order) {
        if (vm.saveAddress) {
            OrderCloud.Addresses.Create(vm.address)
                .then(function(address) {
                    OrderCloud.Me.Get()
                        .then(function(me) {
                            OrderCloud.Addresses.SaveAssignment({
                                    AddressID: address.ID,
                                    UserID: me.ID,
                                    IsBilling: vm.isAlsoBilling,
                                    IsShipping: true
                                })
                                .then(function() {
                                    OrderCloud.Addresses.Get(address.ID)
                                        .then(function(address) {
                                            OrderCloud.Orders.Patch(order.ID, {ShippingAddressID: address.ID})
                                                .then(function() {
                                                    $state.reload();
                                                });
                                        });
                                });
                        });
                });
        }
        else {
            OrderCloud.Orders.Patch(order.ID, {ShippingAddressID: vm.address.ID})
                .then(function() {
                    $state.reload();
                });
        }
    }
}

function OrderShippingAddressFactory($q, $localForage, OrderCloud, appname) {
    var StorageName = appname + '.ShippingAddressID';
    return {
        Get: _get,
        Set: _set,
        Clear: _clear
    };

    function _get() {
        var dfd = $q.defer();
        $localForage.getItem(StorageName)
            .then(function(shipID) {
                if (shipID) {
                    OrderCloud.Addresses.Get(shipID)
                        .then(function(address) {
                            if (!address.Items) {
                                dfd.resolve(address);
                            }
                            else dfd.reject();
                        })
                        .catch(function() {
                            _clear();
                            dfd.reject();
                        });
                }
                else dfd.reject();
            })
            .catch(function() {
                dfd.reject();
            });
        return dfd.promise;
    }

    function _set(ShipAddressID) {
        $localForage.setItem(StorageName, ShipAddressID);
    }

    function _clear() {
        $localForage.removeItem(StorageName);
    }
}

