var util = require('util');
var restify = require('restify');
var stockFetcher = require("stock-fetcher");
var spList = require('sp500-list'),yahooFinance = require('yahoo-finance');
var _ = require('lodash'); 

var currentSNP500 = "";
var expiryTimeStamp = 0; 


function returnStockExchangesInfo(req, res, next) {

 	res.send();
  	next();
}

function returnIndividualStock(req, res, next){

	var stock = req.params.stock;

	stockFetcher.getPrice(String(stock), function(err, price){
	  res.send(stock+": US$"+price)
	});
	
  	next();
}

function returnSNP500(req, res, next){
	var collatedResults = [];
	var count = 0;
	var SYMBOLS = [];
	var FIELDS = _.flatten([
  					['s', 'n', 'd1', 'l1', 'y', 'r']
				]);

	var to_unix_current = Math.round( (Date.now() + (new Date().getTimezoneOffset()) )  / 1000);

	var currentTime = new Date(to_unix_current*1000);
	var expiry_Date = new Date(expiryTimeStamp*1000);
	
	//The SNP500 will refresh every 3.5minutes. This will reduce the load on server.
	if(expiry_Date > currentTime && expiryTimeStamp != 0){
		res.send(currentSNP500);
	}else{

		var myCallback = function(stockList) {   
		        stockList.forEach(function(i)  {

		               SYMBOLS.push(String(i['ticker']));
		             
		        }); 
		        yahooFinance.snapshot({
					  fields: FIELDS,
					  symbols: SYMBOLS
				}, function (err, result) {
					  if (err) { res.send(collatedResults); }
					  _.each(result, function (snapshot, symbol) {
					    		collatedResults.push(snapshot);
		                        count++;

		                        if(count == 500){
		                         	//UNIX timestamp conversion to ensure an apple to apple comparison.
									var to_unix = Math.round( (Date.now() + (new Date().getTimezoneOffset()) )  / 1000);

									expiryTimeStamp = to_unix + (3.5 * 60);
									

									currentSNP500 = collatedResults;
		                         	res.send(collatedResults);
		                        }
					  });
					});
		        
		};  
	 
		spList.fullList(myCallback);
	}
	next();
}

function unknownMethodHandler(req, res) {
  if (req.method.toLowerCase() === 'options') {
      console.log('received an options method request');
    var allowHeaders = ['Accept', 'Accept-Version', 'Content-Type', 'Api-Version', 'Origin', 'X-Requested-With']; // added Origin & X-Requested-With

    if (res.methods.indexOf('OPTIONS') === -1) res.methods.push('OPTIONS');

    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Headers', allowHeaders.join(', '));
    res.header('Access-Control-Allow-Methods', res.methods.join(', '));
    res.header('Access-Control-Allow-Origin', req.headers.origin);

    return res.send(204);
  }
  else
    return res.send(new restify.MethodNotAllowedError());
}



var server = restify.createServer();
server.use(restify.CORS());
server.use(restify.fullResponse());
server.on('MethodNotAllowed', unknownMethodHandler);

server.get('/exchangeInfo', returnStockExchangesInfo);
server.head('/exchangeInfo', returnStockExchangesInfo);
server.get('/checkStock/:stock', returnIndividualStock);
server.head('/checkStock/:stock', returnIndividualStock);
server.get('/returnSNP500', returnSNP500);
server.head('/returnSNP500', returnSNP500);

server.listen(8080, function() {
  console.log('%s listening at %s', server.name, server.url);
});