/*References
** https://bl.ocks.org/d3noob/257c360b3650b9f0a52dd8257d7a2d73
** Update Data: https://bl.ocks.org/NGuernse/a5b3ad4372ed67d8bfcf5bae5990abdb
** Tooltip: http://bl.ocks.org/d3noob/036d13e5173de69f7758091ba9a2df2b
** Click Events fade in and out: http://bl.ocks.org/Matthew-Weber/5645518
** Fixed axis on Graph scroll: http://bl.ocks.org/lmatteis/895a134f490626b0e62796e92a06b9c1 
** Checking if element is visible in viewport: https://usefulangle.com/post/113/javascript-detecting-element-visible-during-scroll
** Draggable Window: https://www.w3schools.com/howto/howto_js_draggable.asp
** Draggable Window: https://www.kirupa.com/html5/drag.htm
** Bring id to viewport: https://hiddedevries.nl/en/blog/2018-12-10-scroll-an-element-into-the-center-of-the-viewport
*/

/*Global Variables Declared */
var maxFollower = 0;
var dataset = [];
var dataNest;
var margin = {top: 120, right: 130, bottom: 120, left: 90};
var minimapMargin =  {top: 20, right: 10, bottom: 20, left: 30};
var width = 1320 - margin.left - margin.right;
var height = 24000 - margin.top - margin.bottom;
var yScale;
var xScale;
var candidateList;
var unsortedCandidateList = [];
var primaryFollowers = [];
var debateFollowers = [];
var dot;
var valueLine;
//Set Color Scale
var color = d3.scaleOrdinal(d3.schemeCategory20);
var div = d3.select("#followergraph").append("div")	
			.attr("class", "tooltip")				
			.style("opacity", 0);

window.onload = function() {
    loadDemocraticList();
};

/*For making sure that only one X-axis is visible based on the viewport*/
window.addEventListener('scroll', function() {
	var element1 = document.querySelector('#topxaxis');
	var position1 = element1.getBoundingClientRect();
	var element2 = document.querySelector('#xaxis');
	var position2 = element2.getBoundingClientRect();

	// checking whether fully visible
	if((position1.top >= 0 && position1.bottom <= window.innerHeight) || position2.top >= 0 && position2.bottom <= window.innerHeight) {
		d3.select("#floataxissvg").remove();
	}

	// checking for partial visibility
	if((position1.top < window.innerHeight && position1.bottom >= 0)|| (position2.top < window.innerHeight && position2.bottom >= 0)) {
		d3.select("#floataxissvg").remove();
	}
	else{
		if(d3.select("#floataxissvg").empty()){
			createFloatingAxis();
		}
	}
});

/* For minimize, maximize, and close functionality of Candidate and Questionaire Floating Window */
jQuery(document).ready(function($){
  $(document).on('click', '#candidatemin', function(){
	$(this).closest('#candidatewindow').find('.content').slideUp();
	$(this).closest('#candidatewindow').css('top', 'auto')
	$(this).closest('#candidatewindow').animate({'left':0,'bottom':0});
  });
  
  $(document).on('click', '#candidatemax', function(){
	$(this).closest('#candidatewindow').find('.content').slideDown();
	$(this).closest('#candidatewindow').find('.content').css('display', 'block')
	$(this).closest('#candidatewindow').animate({'left':'20px','bottom':'5%'});
  });
  
  $(document).on('click', '#candidateclose', function(){
	$(this).closest('#candidatewindow').fadeOut();
  });
   
  $(document).on('click', '#questionairemin', function(){
	$(this).closest('#questionairewindow').find('.content').slideUp();
	$(this).closest('#questionairewindow').css('top', 'auto')
	$(this).closest('#questionairewindow').css('left', 'auto')
	$(this).closest('#questionairewindow').animate({'right':0,'bottom':0});
  });
  
  $(document).on('click', '#questionairemax', function(){
	$(this).closest('#questionairewindow').find('.content').slideDown();
	$(this).closest('#questionairewindow').animate({'right':'30px','bottom':'70%'});
  });
  
  $(document).on('click', '#questionaireclose', function(){
	$(this).closest('#questionairewindow').fadeOut();
  });
});
	
/*Function to load Democratic Candidates list from text file*/
function loadDemocraticList(){
	svg = setupSVG();
	yScale = setupYaxis(svg);
	xScale = setupXaxis(svg);
	valueLine = d3.line()
					.x(function(d) { return xScale(new Date(d.DateTime)); })
					.y(function(d) { return yScale(d.FollowerCount); }); 
	candidateList = [];
	createQuestionaireFloatingWindow();
	d3.text("data/Dem_handles.txt", function(handles) {
		handles = handles.split("\n");
		for(let i= 0; i < handles.length; i++){
			let filePath = "data/" + handles[i].toLowerCase() + "_daily.csv";
			console.log("File Path: " + filePath);
			d3.csv(filePath, function(error, data){
				if(error){
					return;
				}
				data.forEach(function(d){
					d.id = i;
					d.handle = handles[i].toLowerCase();
					d.FollowerCount = +d.FollowerCount;
					dataset.push(d);
				});
				unsortedCandidateList.push(handles[i].toLowerCase());
				var annoucementDifferenceTracker = 0;
				var announcementDate = returnCampaignAnnoucementDate(handles[i].toLowerCase());
				var annoucementClosestPoint = 0;
				var withdrawlDifferenceTracker = 0;
				var withdrawlDate = returnWithdrawlDate(handles[i].toLowerCase());
				var withdrawlClosestPoint = 0; 
				var primaryDifferenceTracker = [];
				var primaryClosestPoint = [];
				var primaryStorage = [];
				var primaryData = returnPrimaryInfo();
				var debateDifferenceTracker = [];
				var debateClosestPoint = [];
				var debateStorage = [];
				var debateData = returnDebateInfo();
				var startMemento = 0;
				var endMemento = 0;
				for (let j=0; j< primaryData.length; j++){
					primaryClosestPoint.push(0);
					primaryDifferenceTracker.push(0);
				}
				for (let j=0; j< debateData.length; j++){
					debateClosestPoint.push(0);
					debateDifferenceTracker.push(0);
				}
				for(let k=0; k< data.length; k++){
					/*Find start and end timestamp for each candidate*/
					if(startMemento == 0){
						startMemento =  new Date(data[k].DateTime);
					}
					if(endMemento == 0){
						endMemento =  new Date(data[k].DateTime);
					}
					if(startMemento.getTime() > new Date(data[k].DateTime).getTime()){
						startMemento = new Date(data[k].DateTime);
					}
					if(endMemento.getTime() < new Date(data[k].DateTime).getTime()){
						endMemento = new Date(data[k].DateTime);
					}
					/*Find closest follower count for  primary date*/
					for(let j=0; j< primaryData.length; j++){
						if(primaryClosestPoint[j] == 0){
							primaryClosestPoint[j] = + data[k].FollowerCount;
							primaryDifferenceTracker[j] = Math.abs(primaryData[j].date.getTime() - new Date(data[k].DateTime).getTime());
						}
						var currentDifference = Math.abs(primaryData[j].date.getTime() - new Date(data[k].DateTime).getTime());
						if(currentDifference < primaryDifferenceTracker[j]){
							primaryDifferenceTracker[j] = currentDifference;
							primaryClosestPoint[j] = + data[k].FollowerCount;
						}
					}
					
					for(let j=0; j< debateData.length; j++){
						if(debateClosestPoint[j] == 0){
							debateClosestPoint[j] = + data[k].FollowerCount;
							debateDifferenceTracker[j] = Math.abs(debateData[j].date.getTime() - new Date(data[k].DateTime).getTime());
						}
						var currentDifference = Math.abs(debateData[j].date.getTime() - new Date(data[k].DateTime).getTime());
						if(currentDifference < debateDifferenceTracker[j]){
							debateDifferenceTracker[j] = currentDifference;
							debateClosestPoint[j] = + data[k].FollowerCount;
						}
					}
					/*Find closest follower count for announcement date*/
					if(annoucementClosestPoint == 0){
						annoucementClosestPoint = + data[k].FollowerCount;
						annoucementDifferenceTracker = Math.abs(announcementDate.getTime() - new Date(data[k].DateTime).getTime())
					}
					var currentDifference = Math.abs(announcementDate.getTime() - new Date(data[k].DateTime).getTime())
					if(currentDifference < annoucementDifferenceTracker){
						annoucementDifferenceTracker = currentDifference;
						annoucementClosestPoint = + data[k].FollowerCount;
					}
					/*Find closest follower count for withdrawl date*/
					if(typeof withdrawlDate == 'undefined'){
						continue;
					}else{
						if(withdrawlClosestPoint == 0){
							withdrawlClosestPoint = + data[k].FollowerCount;
							withdrawlDifferenceTracker = Math.abs(withdrawlDate.getTime() - new Date(data[k].DateTime).getTime())
						}
						var currentDifference = Math.abs(withdrawlDate.getTime() - new Date(data[k].DateTime).getTime())
						if(currentDifference < withdrawlDifferenceTracker){
							withdrawlDifferenceTracker = currentDifference;
							withdrawlClosestPoint = + data[k].FollowerCount;
						}
					}
					
				}
				for(let j=0; j<primaryData.length; j++){
					primaryFollowers.push({"handle": handles[i].toLowerCase(), "follower": primaryClosestPoint[j], "event": primaryData[j].date, "count": (j + 1) });
				}
				
				for(let j=0; j<debateData.length; j++){
					debateFollowers.push({"handle": handles[i].toLowerCase(), "follower": debateClosestPoint[j], "event": debateData[j].date, "count": (j + 1)});
				}
				//primaryFollowers.push(primaryStorage);
				//debateFollowers.push(debateStorage);
				var max = d3.max(data, function(d) { return d.FollowerCount; });
				candidateList.push({"handle": handles[i].toLowerCase(), "follower": max, "announcement": annoucementClosestPoint, "withdrawl": withdrawlClosestPoint, "start": startMemento, "end": endMemento});
				if (max > maxFollower){
					maxFollower = max;
					yScale = setupYaxis(svg);
				}
				// Nest the entries by name
				dataNest = d3.nest()
							.key(function (d) {
								return d.id;
							})
							.entries(dataset);
				if(d3.select("#scatter").empty()){
					plotFollowerChart();
				}
				else{
					updateFollowerChart();
				}
				sortCandidates();
				createCandidateFloatingWindow(candidateList);
				addAccountDeletionMark();
			});
		}
	});
}

/*Function to read follower analysis text file*/
function readInfoFile(){
	var candidateFollowerAnalysis = [];
	d3.text("data/Info.txt", function(data) {
		console.log("Read InfoTxt file");
		data = data.split("\n")
		var temp = {};
		for(let i=0; i< data.length; i++){
			//console.log(data[i]);
			if((i + 1)%4 == 1){
				console.log("Handle: " + data[i]);
				temp["handle"] = data[i];
			}else if((i + 1)%4 == 2){
				console.log("Start: " + data[i]);
				let splitter = data[i].split(",");
				temp["startmemento"] = new Date(splitter[0].split("ST: ")[1]);
				temp["startfollower"] = splitter[1].split("SCount: ")[1]
			}else if((i + 1)%4 == 3){
				console.log("End: " + data[i]);
				let splitter = data[i].split(",");
				temp["endmemento"] = new Date(splitter[0].split("ET: ")[1]);
				temp["endfollower"] = splitter[1].split("ECount: ")[1]
			}else if((i + 1)%5 == 0){
				console.log("Analysis: " + data[i]);
				let splitter = data[i].split(",");
				temp["increase"] = splitter[0].split("Increase: ")[1];
				temp["perc"] = splitter[1].split("%Increase: ")[1]
				console.log(temp);
				candidateFollowerAnalysis.push(temp);
				temp = {};
			}
		}
		console.log(candidateFollowerAnalysis);
		return candidateFollowerAnalysis;
	});
}

/*Function to sort the candidate list based on follower count*/
function sortCandidates(){
	for(let i=0; i< candidateList.length -1;i++){
		for(let j=0; j< candidateList.length-i-1; j++){
			if(candidateList[j].follower < candidateList[j+1].follower){
				let temp = candidateList[j];
				candidateList[j] = candidateList[j+1];
				candidateList[j+1] = temp;
			}
		}
	}
}

/*Function to create  Questionaire Menu*/
function createQuestionaireMenu(id){
	let debateCount = 11;
	let primaryCount = 7;
	console.log("CreateMenu: " + id)
	if(id == 1){
		if(document.getElementById("debate").checked){
			var debateData = returnDebateInfo();
			svg.selectAll(".debate")
				.data(debateData)
				.enter()
				.append("line")
				.attr("class", "debate")
				.attr("id", function(d){ return ("debate-" + d.id);})
				.attr("x1", function(d){return xScale(d.date);})
				.attr("x2", function(d){return xScale(d.date);})
				.attr("y1", yScale(0))
				.attr("y2", yScale(Math.ceil(maxFollower/1000000)*1000000))
				.attr("stroke-width", 4)
				.style("opacity", 0.5)
				.attr("stroke", "#90EE90")
				.on("mouseover", function(d) {		
					div.transition()		
						.duration(200)		
						.style("opacity", 0.9);		
					div.html(d.debate + "<br/>" + d.date.toISOString().split("T")[0])	
						.style("left", (d3.event.pageX) + "px")		
						.style("top", (d3.event.pageY - 28) + "px");
					d3.select("#debate-" + d.id).style("stroke-width", 6);
					let selectDebatePoints = $(".debatepoint");
					for(let j=0; j < selectDebatePoints.length; j++){
						if(selectDebatePoints[j].style.opacity > 0 && selectDebatePoints[j].getAttribute('count') == d.id){
							d3.select("#" + selectDebatePoints[j].id)
													.transition()
													.duration(200)
													.attr('r', 6);
						}
					}
				})					
				.on("mouseout", function(d) {		
					div.transition()		
						.duration(500)		
						.style("opacity", 0);
					d3.select("#debate-" + d.id).style("stroke-width", 4);	
					let selectDebatePoints = $(".debatepoint");
					for(let j=0; j < selectDebatePoints.length; j++){
						if(selectDebatePoints[j].style.opacity > 0 && selectDebatePoints[j].getAttribute('count') == d.id){
							d3.select("#" + selectDebatePoints[j].id)
													.transition()
													.duration(200)
													.attr('r', 4);
						}
					}					
				});
			var debateList = returnDebateList();
			//var debateListInfo = []
			let x = 0;
			for(let j=0; j<unsortedCandidateList.length; j++){
				var tempList = [];
				for(let k=0; k< debateList.length; k++){
					let flag = true;
					for(let a= 0; a < debateList[k].length; a++){
						if(unsortedCandidateList[j] == debateList[k][a]){
							debateFollowers[x]["present"] = true;
							flag = false;
						}
					}
					if(flag){
						debateFollowers[x]["present"] = false;
					}
					x++;
				}
			}
			svg.selectAll(".debatepoint")
				.data(debateFollowers)
				.enter()
				.filter(function(d){return d.present;})
				.append("circle")
				.attr("id", function(d){ return "debatePoints-" + d.handle + "-" + d.count;})
				.attr("class", "debatepoint")
				.attr("data:count", function(d){return d.count;})
				.attr("cx", function(d){
					return xScale(d.event);
				})
				.attr("cy", function(d){
					return yScale(d.follower);
				})
				.attr("r", 4)
				.style("opacity", function(d){
					return $("#line-" + d.handle).css("opacity");
				})
				.style("fill", "blue")
				.on("mouseover", function(d) {		
					div.transition()		
						.duration(200)		
						.style("opacity", 0.9);		
					div.html("@" + d.handle + "<br/>" + "Debate:" + d.event.toISOString().split("T")[0])	
						.style("left", (d3.event.pageX) + "px")		
						.style("top", (d3.event.pageY - 28) + "px");
					d3.select("#debate-" + d.count).style("stroke-width", 6);	
					d3.select("#debatePoints-" + d.handle + "-" + d.count)
											.transition()
											.duration(200)
											.attr('r', 6);
				})					
				.on("mouseout", function(d) {		
					div.transition()		
						.duration(500)		
						.style("opacity", 0);
					d3.select("#debate-" + d.count).style("stroke-width", 4);	
					let selectDebatePoints = $(".debatepoint");
					d3.select("#debatePoints-" + d.handle + "-" + d.count)
											.transition()
											.duration(200)
											.attr('r', 4);
				});
		}
		else{
			d3.selectAll(".debate").remove();
			d3.selectAll(".debatepoint").remove();
		}
	}else if(id == 2){
		if(document.getElementById("primary").checked){
			var primaryDate = returnPrimaryInfo();
			svg.selectAll(".primary")
					.data(primaryDate)
					.enter()
					.append("line")
					.attr("class", "primary")
					.attr("id", function(d){return ("primary-" + d.id);})
					.attr("x1", function(d){return (xScale(d.date));})
					.attr("x2", function(d){return (xScale(d.date));})
					.attr("y1", yScale(0))
					.attr("y2", yScale(Math.ceil(maxFollower/1000000)*1000000))
					.attr("stroke-width", 4)
					.style("opacity", 0.5)
					.attr("stroke", "#FFA07A")
					.on("mouseover", function(d) {		
						div.transition()		
							.duration(200)		
							.style("opacity", 0.9);		
						div.html(d.event + "<br/>" + d.date.toISOString().split("T")[0])	
							.style("left", (d3.event.pageX) + "px")		
							.style("top", (d3.event.pageY - 28) + "px");
						d3.select("#primary-" + d.id).style("stroke-width", 6);
						let selectPrimaryPoints = $(".primarypoint");
						for(let j=0; j < selectPrimaryPoints.length; j++){
							if(selectPrimaryPoints[j].style.opacity > 0 && selectPrimaryPoints[j].getAttribute('count') == d.id){
								d3.select("#" + selectPrimaryPoints[j].id)
														.transition()
														.duration(200)
														.attr('r', 6);
							}
						}
					})					
					.on("mouseout", function(d) {		
						div.transition()		
							.duration(500)		
							.style("opacity", 0);
						d3.select("#primary-" + d.id).style("stroke-width", 4);
						let selectPrimaryPoints = $(".primarypoint");
						for(let j=0; j < selectPrimaryPoints.length; j++){
							if(selectPrimaryPoints[j].style.opacity > 0 && selectPrimaryPoints[j].getAttribute('count') == d.id){
								d3.select("#" + selectPrimaryPoints[j].id)
														.transition()
														.duration(200)
														.attr('r', 4);
							}
						}
					});
			console.log(primaryFollowers);
			svg.selectAll(".primarypoint")
				.data(primaryFollowers)
				.enter()
				.filter(function(d){
					let withrawlDate = returnWithdrawlDate(d.handle);
					let campaignDate = returnCampaignAnnoucementDate(d.handle);
					if(typeof(returnWithdrawlDate(d.handle)) != 'undefined' && withrawlDate.getTime() > d.event.getTime() && campaignDate.getTime() < d.event.getTime())
						return true;
					else
						return false;
				})
				.append("circle")
				.attr("id", function(d){return ("primaryPoints-" + d.handle + "-" + d.count);})
				.attr("class", "primarypoint")
				.attr("data:count", function(d){return d.count;})
				.attr("cx", function(d){
						return xScale(d.event);
				})
				.attr("cy", function(d){
						return yScale(d.follower);
				})
				.attr("r", 4)
				.style("opacity", function(d){
						return $("#line-" + d.handle).css("opacity");
				})
				.style("fill", "#F503DF")
				.on("mouseover", function(d) {		
					div.transition()		
						.duration(200)		
						.style("opacity", 0.9);		
					div.html("@" + d.handle + "<br/>" + "Primary:" + d.event.toISOString().split("T")[0] + "<br/>"  + "Announce: " + returnCampaignAnnoucementDate(d.handle).toISOString().split("T")[0] + "<br/>" + "Withdraw:" + returnWithdrawlDate(d.handle).toISOString().split("T")[0])	
						.style("left", (d3.event.pageX) + "px")		
						.style("top", (d3.event.pageY - 28) + "px");
					d3.select("#primary-" + d.count).style("stroke-width", 6);
					d3.select("#primaryPoints-" + d.handle + "-" + d.count)
											.transition()
											.duration(200)
											.attr('r', 6);
				})					
				.on("mouseout", function(d) {		
					div.transition()		
						.duration(500)		
						.style("opacity", 0);
					d3.select("#primary-" + d.count).style("stroke-width", 4);
					d3.select("#primaryPoints-" + d.handle + "-" + d.count)
											.transition()
											.duration(200)
											.attr('r', 4);					
				});
		}else{
			d3.selectAll(".primary").remove();
			d3.selectAll(".primarypoint").remove();
		}
	}else if(id == 4){
		if(document.getElementById("campaign").checked){
			var announcementData = []
			for(var i=0; i< candidateList.length; i++){
				var annoucementDate = returnCampaignAnnoucementDate(candidateList[i].handle);
				if(annoucementDate.getFullYear() < 2019){
					announcementData.push({"handle": candidateList[i].handle, "announcement": annoucementDate, "follower": candidateList[i].announcement});
				}else{
					announcementData.push({"handle": candidateList[i].handle, "announcement": annoucementDate, "follower": candidateList[i].announcement});
				}
			}

			svg.selectAll(".ancircle")
				.data(announcementData)
				.enter()
				.append("circle")
				.attr("class", "ancircle")
				.attr("id", function(d){return ("an-" + d.handle);})
				.attr("cx", function(d){
					if(d.announcement.getFullYear() < 2019)
						{return xScale(new Date("2019-01-01"));}
					else
				{return xScale(d.announcement);}})
				.attr("cy", function(d){return yScale(d.follower);})
				.attr("r", 6)
				.style("opacity", function(d){
					return $("#line-" + d.handle).css("opacity");})
				.style("fill", "#006400")
				.on("mouseover", function(d) {
					var content;
					if(d.announcement.getFullYear() < 2019){
						content = "@" + d.handle + "<br/>"  + "Announce: " + d.announcement.toISOString().split("T")[0] + "<br/>" + "Pre-2019";
					}else{
						content = "@" + d.handle + "<br/>"  + "Announce: "  + d.announcement.toISOString().split("T")[0];
					}
					div.transition()		
						.duration(200)		
						.style("opacity", 0.9);	
						
					div.html(content)	
						.style("left", (d3.event.pageX) + "px")		
						.style("top", (d3.event.pageY - 28) + "px");
				})					
				.on("mouseout", function(d) {		
					div.transition()		
						.duration(500)		
						.style("opacity", 0);	
				});
		}else{
			d3.selectAll(".ancircle").remove();
		}
	}else if(id == 5){
		if(document.getElementById("withdrawl").checked){
			var withdrawlData = []
			for(var i=0; i< candidateList.length; i++){
				var withdrawlDate = returnWithdrawlDate(candidateList[i].handle);
				if(typeof withdrawlDate != 'undefined'){
					withdrawlData.push({"handle": candidateList[i].handle, "withdrawl": withdrawlDate, "follower": candidateList[i].withdrawl});
				}
				if($("#line-" + candidateList[i].handle + "-dash").css("stroke-width") == "4px"){
					d3.select("#line-" + candidateList[i].handle + "-dash")
						.style("stroke-dasharray", "10,10");
				}
			}
			svg.selectAll(".wcircle")
				.data(withdrawlData)
				.enter()
				.append("circle")
				.attr("class", "wcircle")
				.attr("id", function(d){return ("w-" + d.handle);})
				.attr("cx", function(d){return xScale(d.withdrawl);})
				.attr("cy", function(d){return yScale(d.follower);})
				.attr("r", 6)
				.style("fill", "red")
				.style("opacity", function(d){
					return $("#line-" + d.handle).css("opacity");})
				.on("mouseover", function(d) {		
					div.transition()		
						.duration(200)		
						.style("opacity", .9);		
					div.html("@" + d.handle + "<br/>"  + "Withdraw: " + d.withdrawl.toISOString().split("T")[0])	
						.style("left", (d3.event.pageX) + "px")		
						.style("top", (d3.event.pageY - 28) + "px");	
				})					
				.on("mouseout", function(d) {		
					div.transition()		
						.duration(500)		
						.style("opacity", 0);	
				});					
		}else{
			d3.selectAll(".wcircle").remove();
			d3.selectAll(".line")
				.style("stroke-dasharray", "0");
		}
	}

}

/*Function to create Questionaire Floating Window*/
function createQuestionaireFloatingWindow(){
	var elmnt = document.getElementById("questionairewindow");
	var content = document.getElementById("questionairecontent");
	content.innerHTML = "";
	var rankedOrder = "";
	var span = 
		content.innerHTML +=  '<input type="checkbox" id="debate" name="debate" value="debate" onclick="createQuestionaireMenu(\'' + 1 + '\')"> </input> <label id="debate">Debate</label>'+ '<br/>';
		content.innerHTML +=  '<input type="checkbox" id="primary" name="primary" value="primary" onclick="createQuestionaireMenu(\'' + 2 + '\')"> </input> <label id="primary">Primary & Caucus</label>'+ '<br/>';
		//content.innerHTML +=  '<input type="checkbox" id="caucus" name="caucus" value="caucus" onclick="createQuestionaireMenu(\'' + 3 + '\')"> </input> <label id="caucus">Caucuses</label>'+ '<br/>';
		content.innerHTML +=  '<input type="checkbox" id="campaign" name="campaign" value="campaign" onclick="createQuestionaireMenu(\'' + 4 + '\')"> </input> <label id="campaign">Campaign Announced</label>'+ '<br/>';
		content.innerHTML +=  '<input type="checkbox" id="withdrawl" name="withdrawl" value="withdrawl" onclick="createQuestionaireMenu(\'' + 5 + '\')"> </input> <label id="withdrawl">Campaign Withdrawl</label>'+ '<br/>';

	var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0; 
	if (document.getElementById(content.id)) {
		/* if present, the header is where you move the DIV from:*/
		document.getElementById(content.id).onmousedown = dragMouseDown;
	} else {
		/* otherwise, move the DIV from anywhere inside the DIV:*/
		content.onmousedown = dragMouseDown;
	}

	function dragMouseDown(e) {
		console.log("DragMouse Down");
		e = e || window.event;
		e.preventDefault();
		// get the mouse cursor position at startup:
		pos3 = e.clientX;
		pos4 = e.clientY;
		document.onmouseup = closeDragElement;
		// call a function whenever the cursor moves:
		document.onmousemove = elementDrag;
	}

	function elementDrag(e) {
		console.log("Element Drag");
		e = e || window.event;
		e.preventDefault();
		// calculate the new cursor position:
		pos1 = pos3 - e.clientX;
		pos2 = pos4 - e.clientY;
		pos3 = e.clientX;
		pos4 = e.clientY;
		// set the element's new position:
		// Set the bottom and right to auto to make sure the drag works without any change to size
		elmnt.style.bottom = "auto";
		elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
		elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
		elmnt.style.right = "auto";
	}

	function closeDragElement() {
		/* stop moving when mouse button is released:*/
		document.onmouseup = null;
		document.onmousemove = null;
	}
}

/*Function to create top X-axis*/
function createFloatingAxis(){
	var margin = {top: 120, right: 130, bottom: 20, left: 90};
	var height = 110;
	var svg = d3.select("#floatingaxis").append("svg")
				.attr("width", width + margin.left + margin.right )
				.attr("height", height)
				.attr("id", "floataxissvg")
				.append("g")
				.attr("transform", "translate(" + margin.left + "," + (height - margin.bottom) + ")");
				
	var xScale = d3.scaleTime()
				.domain([new Date("2019-01-01 00:00:00"), new Date("2020-04-18 23:59:59")])
				.range([ 0, width])
				.nice();
	
	svg.append("text")
		.attr("class", "yearlabel")
		.attr("id", "firstyear")
		.attr("transform", "translate(" + (width/3) + ", -60)")
		.attr("dy", ".5em")
		.style("opacity", 1)
		.style("fill", "red")
		.style("font", "24px times")
		.text("2019");
	
	svg.append("text")
		.attr("class", "yearlabel")
		.attr("id", "secondyear")
		.attr("transform", "translate(" + (0.85 * width) + ", -60)")
		.attr("dy", ".5em")
		.style("opacity", 1)
		.style("fill", "red")
		.style("font", "24px times")
		.text("2020");
	svg.append("g")
		.attr("id", "floataxis")
		.style("font", "24px times")
		.style("text-align", "center")
		.call(d3.axisTop(xScale).tickFormat(d3.timeFormat("%b")))
		.selectAll("text")
		.attr("transform", "translate(0,-10)");
	
}

/*Function to bring the plot of candidate based on click from Candidate Floating Window*/
function highlightCandidatePlot(handle){
	if(document.getElementById(handle).checked){
		document.getElementById("label-" + handle).scrollIntoView({block: "center"});
		d3.select("#line-" + handle)
			.style("stroke-width",4);
		var selectAllLines = $('.line').not("#line-"+handle);  
		d3.selectAll(selectAllLines)
			.style("stroke-width",1.5);
		d3.select("#line-" + handle + "-dash")
			.style("stroke-width",4);
		d3.select("#label-" + handle)
			.style("font-weight", "bold");
		var selectAllText = $('.label').not("#label-" + handle);
		d3.selectAll(selectAllText)
			.style("font-weight", "normal");
	}
}

/*Function to hide and show plot of Candidates based on checkbox values*/
function changePlotStatus(handle){
	console.log("changePlotStatus");
	if(handle == "selectAll"){
		var handlesList = unsortedCandidateList;
	}else{
		var handlesList = [handle];
	}
	let selectDebatePoint = $(".debatepoint");
	let selectPrimaryPoint = $(".primarypoint");
	if(document.getElementById(handle).checked){
		for(let i=0; i< handlesList.length; i++){
			d3.select("#line-" + handlesList[i]+"-dash")
				.style("opacity", 1);
			d3.select("#line-" + handlesList[i]+"-minimap")
				.style("opacity", 0.5);
			d3.select("#line-" + handlesList[i])
				.style("opacity", 1);
			d3.select("#line-" + handlesList[i])
				.style("stroke-width", 1.5);
			d3.select("#line-" + handlesList[i] + "-dash")
				.style("stroke-width", 1.5);
			d3.select("#line-" + handlesList[i] + "-dash")
				.style("stroke-dasharray", "0");
			d3.select("#scatter-" + handlesList[i]).selectAll(".dot")
				.style("opacity", 1);
			d3.select("#label-" + handlesList[i])
				.style("opacity", 1);
			d3.select("#label-" + handlesList[i])
				.style("font-weight", "normal");
			for(let j=0; j < selectDebatePoint.length; j++){
				let temp = selectDebatePoint[j].id.split("-");
				if(temp[1] == handlesList[i])
					d3.select(selectDebatePoint[j])
						.style("opacity", 1);				
			}
			for(let j=0; j < selectPrimaryPoint.length; j++){
				let temp = selectPrimaryPoint[j].id.split("-");
				if(temp[1] == handlesList[i])
					d3.select(selectPrimaryPoint[j])
						.style("opacity", 1);				
			}
			d3.select("#an-" + handlesList[i])
				.style("opacity", 1);
			d3.select("#w-" + handlesList[i])
				.style("opacity", 1);
			if(handlesList[i] == "mikegravel")	
				d3.select("#accountDeletion").style("opacity", 1);
			if(handle == "selectAll"){
				document.getElementById(handlesList[i]).checked = true;
			}
		}
			
	}
	else{
		for(let i=0; i< handlesList.length; i++){
			if(handlesList[i] == "mikegravel")
				d3.select("#accountDeletion").style("opacity", 0);
			d3.select("#line-" + handlesList[i])
				.style("opacity", 0);
			d3.select("#scatter-" + handlesList[i]).selectAll(".dot")
				.style("opacity", 0);
			d3.select("#label-" + handlesList[i])
				.style("opacity", 0);
			for(let j=0; j < selectDebatePoint.length; j++){
				let temp = selectDebatePoint[j].id.split("-");
				if(temp[1] == handlesList[i])
					d3.select(selectDebatePoint[j])
						.style("opacity", 0);				
			}
			for(let j=0; j < selectPrimaryPoint.length; j++){
				let temp = selectPrimaryPoint[j].id.split("-");
				if(temp[1] == handlesList[i])
					d3.select(selectPrimaryPoint[j])
						.style("opacity", 0);				
			}
			d3.select("#an-" + handlesList[i])
				.style("opacity", 0);
			d3.select("#w-" + handlesList[i])
				.style("opacity", 0);
			d3.select("#line-" + handlesList[i]+"-dash")
				.style("opacity", 0);
			d3.select("#line-" + handlesList[i]+"-minimap")
				.style("opacity", 0);
			if(handle == "selectAll"){
				document.getElementById(handlesList[i]).checked = false;
			}
		}
	}
}

/*Function to create floating window for Follower Count Sorted Candidate List*/
function createCandidateFloatingWindow(rankedOrderList){
	var elmnt = document.getElementById("candidatewindow");
	var content = document.getElementById("candidatecontent");
	content.innerHTML = "";
	var rankedOrder = "";
	content.innerHTML = '<input type="checkbox" id=selectAll' + ' name= selectAll' + ' value=selectAll' + 
						' onchange="changePlotStatus(\'' + "selectAll" + '\')" checked>' + '<label id=selectAll' 
						+ '>' + '<span >'+ "Select All" + '</span>' + '</label><br>';
	for(let i=0; i< rankedOrderList.length;i++){
		content.innerHTML += '<input type="checkbox" id=' + rankedOrderList[i].handle + ' name= ' + rankedOrderList[i].handle + ' value=' 
								+ rankedOrderList[i].handle + ' onchange="changePlotStatus(\'' + rankedOrderList[i].handle + '\')" checked>' + '<label id=' 
								+ rankedOrderList[i].handle + '>' + '<span class="fakelink" onclick="highlightCandidatePlot(\'' + rankedOrderList[i].handle + '\')">'+ '@' 
								+ rankedOrderList[i].handle + '</span>' + '</label><br>';
		//content.innerHTML +=  '<span onclick="highlightCandidatePlot(\'' + rankedOrderList[i].handle + '\')">'+ '@' + rankedOrderList[i].handle + '</span>'+ '<br/>';
	}

	var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0; 
	if (document.getElementById(content.id)) {
		/* if present, the header is where you move the DIV from:*/
		document.getElementById(content.id).onmousedown = dragMouseDown;
	} else {
		/* otherwise, move the DIV from anywhere inside the DIV:*/
		content.onmousedown = dragMouseDown;
	}

	function dragMouseDown(e) {
		console.log("DragMouse Down");
		e = e || window.event;
		e.preventDefault();
		// get the mouse cursor position at startup:
		pos3 = e.clientX;
		pos4 = e.clientY;
		document.onmouseup = closeDragElement;
		// call a function whenever the cursor moves:
		document.onmousemove = elementDrag;	
	}

	function elementDrag(e) {
		console.log("Element Drag");
		e = e || window.event;
		e.preventDefault();
		// calculate the new cursor position:
		pos1 = pos3 - e.clientX;
		pos2 = pos4 - e.clientY;
		pos3 = e.clientX;
		pos4 = e.clientY;
		// set the element's new position:
		elmnt.style.bottom = "auto";
		elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
		elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
	}

	function closeDragElement() {
		/* stop moving when mouse button is released:*/
		document.onmouseup = null;
		document.onmousemove = null;
	}
}

/*Function to set up SVG*/
function setupSVG(){
	var scrollContainer = document.getElementById('followergraph')

	// Add SVG to the HTML
	svg = d3.select(scrollContainer).append("svg")
	
				.attr("width", width + margin.left + margin.right)
				.attr("height", height + margin.top + margin.bottom)
				.append("g")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
	
	return svg;
}

/*Function to set up Y-axis*/
function setupYaxis(svg){
	console.log("Set up Y axis");
	//Add Y-axis	
	var yScale = d3.scaleLinear()
				.domain([0, maxFollower])
				.range([ height, 0 ])
				.nice();
	
	var axisLabels = [];
	var tickCount = 50; 
	var followerLimit = Math.ceil(maxFollower/1000000)*1000000;
	for(var i=0; i<500000;i+=50000){
		axisLabels.push(i);
	}
	for(var i=500000;i <= followerLimit; i+=100000){
		axisLabels.push(i);
	}
	if (d3.select("#yaxis").empty()){
		svg.append("g")
		.attr("id", "yaxis")
		.style("font", "24px times")
		.call(d3.axisLeft(yScale)
				.ticks(axisLabels.length)
				.tickValues(axisLabels)
				.tickFormat(function(d){
					if(d == 0)
						return d;
					else if(d >= 1000000)
						return d3.formatPrefix(".2", 1e6)(d);
					else
						return d3.formatPrefix(".0", 1e4)(d);
				})
			);
	}
	else{
		svg.selectAll("#yaxis")
        .style("font", "24px times")
		.call(d3.axisLeft(yScale)
				.ticks(axisLabels.length)
				.tickValues(axisLabels)
				.tickFormat(function(d){
					if(d == 0)
						return d;
					else if(d >= 1000000)
						return d3.formatPrefix(".2", 1e6)(d);
					else
						return d3.formatPrefix(".0", 1e4)(d);
				}));
	}
	return yScale;
}

/*Function to set up top fixed and bottom X-axis*/
function setupXaxis(svg){
	console.log("Set up X axis");
	 // Add X-axis
	var xScale = d3.scaleTime()
				.domain([new Date("2019-01-01 00:00:00"), new Date("2020-04-18 23:59:59")])
				.range([ 0, width])
				.nice();
	
	svg.append("text")
		.attr("class", "yearlabel")
		.attr("transform", "translate(" + (width/3) + ", -60)")
		.attr("dy", ".5em")
		.style("opacity", 1)
		.style("fill", "red")
		.style("font", "24px times")
		.text("2019");
	
	svg.append("text")
		.attr("class", "yearlabel")
		.attr("transform", "translate(" + (0.85 * width) + ", -60)")
		.attr("dy", ".5em")
		.style("opacity", 1)
		.style("fill", "red")
		.style("font", "24px times")
		.text("2020");

	svg.append("g")
		.attr("transform", "translate(0, 0)")
		.attr("id", "topxaxis")
		.style("font", "24px times")
		.call(d3.axisTop(xScale).tickFormat(d3.timeFormat("%b")))
		.selectAll("text")
		.attr("transform", "translate(0,-10)");	
	
	svg.append("g")
		.attr("transform", "translate(0," + height + ")")
		.attr("id", "xaxis")
		.style("font", "24px times")
		.call(d3.axisBottom(xScale).tickFormat(d3.timeFormat("%b")))
		.selectAll("text")
		.attr("transform", "translate(0,10)");
	
	svg.append("text")
		.attr("class", "yearlabel")
		.attr("transform", "translate(" + (width/3) + "," +  (height +60) + ")")
		.attr("dy", ".5em")
		.style("opacity", 1)
		.style("fill", "red")
		.style("font", "24px times")
		.text("2019");
	
	svg.append("text")
		.attr("class", "yearlabel")
		.attr("transform", "translate(" + (0.85 * width) + "," +  (height +60) + ")")
		.attr("dy", ".5em")
		.style("opacity", 1)
		.style("fill", "red")
		.style("font", "24px times")
		.text("2020");
	return xScale;
}

/*Function to plot the initial follower chart*/
function plotFollowerChart(){
	console.log("Plot follower chart");

	dot = svg.append("g")
			.attr("id", "scatter")
			.attr("transform", "translate( 0" + ","   + " 0)");
	
	dataNest.forEach(function(d, i){
		
		svg.append("path")
			.attr("class", "line")
			.attr("d", function(){
				let withdrawlDate = returnWithdrawlDate(d.values[0].handle);
				let values = []
				if(typeof(withdrawlDate) == 'undefined'){
					return valueLine(d.values);
				}else{
					for(let j=0; j< d.values.length; j++){
						if(new Date(d.values[j].DateTime).getTime() <= withdrawlDate.getTime()){
							values.push(d.values[j]);
						}else{
							values.push(d.values[j]);
							break;
						}
					}
					return valueLine(values);
				}
			})
			.attr("id", "line-" + d.values[0].handle)
			.attr("fill", "none")
			.style("opacity", 1)
			.attr("stroke", function(){
				return d.color = color(d.key);})
			.attr("stroke-width", 1.5)
			.on("click", function(){
					console.log("Clicked the text: " + i);
					highlightLabelGraph(d.values[0].handle);
			});

		svg.append("path")
			.attr("class", "line")
			.attr("d", function(){
				let withdrawlDate = returnWithdrawlDate(d.values[0].handle);
				let values = []
				if(typeof(withdrawlDate) != 'undefined'){
					for(let j=0; j< d.values.length; j++){
						if(new Date(d.values[j].DateTime).getTime() >= withdrawlDate.getTime()){
							values.push(d.values[j]);
						}
					}
					return valueLine(values);
				}else{
					console.log("Undefined line data:" + d.values[0].handle);
				}
			})
			.attr("id", "line-" + d.values[0].handle + "-dash")
			.attr("fill", "none")
			.style("opacity", function(d){
				if(d != 'undefined')
					return 1;})
			.attr("stroke", function(){
				console.log("Color: " + d.values[0].handle);
				return d.color = color(d.key);})
			.attr("stroke-width", 1.5)
			.attr("stroke-dasharray", "0")
			.on("click", function(){
					console.log("Clicked the text: " + i);
					highlightLabelGraph(d.values[0].handle);
			});
		svg.append("text")
			.attr("class", "label")
			.attr("id", "label-" + d.values[0].handle)
			.attr("transform", "translate("+(width - 30)+","+yScale(d.values[d.values.length - 1].FollowerCount)+")")
			.attr("dy", ".5em")
			.style("opacity", 1)
			.attr("text-anchor", "start")
			.style("fill", function() {
				return d.color = color(d.key); })
			.style("font", "20px times")
			.text("@" + d.values[0].handle)
			.on("click", function(){
				console.log("Clicked the text: " + i);
				highlightLabelGraph(d.values[0].handle);
			});
		dot.append("g")
			.attr("id", "scatter-" + d.values[0].handle)
			.selectAll(".dot")
			.data(d.values)
			.enter()
			.append("circle")
			.attr("class", "dot")
			.attr("r", 3)
			.style("opacity", 1)
			.attr("cy", function(d) {
				return yScale(d.FollowerCount);})
			.attr("cx", function(d) {
				return xScale(new Date(d.DateTime));})
			.style("fill", function() {
				return d.color = color(d.key);})
			.on("click", function(){
					console.log("Clicked the text: " + i);
					highlightLabelGraph(d.values[0].handle);
				})
			.on("mouseover", function(d) {		
				div.transition()		
					.duration(200)		
					.style("opacity", 0.9);		
				div.html("@" + d.handle + "<br/>" + "Memento: " + new Date(d.DateTime).toISOString().split("T")[0] + "Follower: " + "<br/>" + d3.format(",")(d.FollowerCount))	
					.style("left", (d3.event.pageX) + "px")		
					.style("top", (d3.event.pageY - 28) + "px");
			})					
			.on("mouseout", function(d) {		
				div.transition()		
					.duration(500)		
					.style("opacity", 0);	
			});
	});
}

/*Function to update the follower chart*/
function updateFollowerChart(){
	//console.log(dataNest);
	dataNest.forEach(function(d, i){
		if(d3.select("#scatter-"+d.values[0].handle).empty()) {

			svg.append("path")
				.attr("class", "line")
				.attr("id", "line-" + d.values[0].handle)
				.attr("fill", "none")
				.attr("stroke", function(){
					return d.color = color(d.key);})
				.attr("stroke-width", 1.5)
				.style("opacity", 1)
				.attr("d", function(){
					let withdrawlDate = returnWithdrawlDate(d.values[0].handle);
					let values = []
					if(typeof(withdrawlDate) == 'undefined'){
						return valueLine(d.values);
					}else{
						for(let j=0; j< d.values.length; j++){
							if(new Date(d.values[j].DateTime).getTime() <= withdrawlDate.getTime()){
								values.push(d.values[j]);
							}else{
								values.push(d.values[j]);
								break;
							}
						}
						return valueLine(values);
					}
				})
				.on("click", function(){
					console.log("Clicked the text: " + i);
					highlightLabelGraph(d.values[0].handle);
				});

		svg.append("path")
			.attr("class", "line")
			.attr("d", function(){
				let withdrawlDate = returnWithdrawlDate(d.values[0].handle);
				let values = []
				if(typeof(withdrawlDate) != 'undefined'){
					for(let j=0; j< d.values.length; j++){
						if(new Date(d.values[j].DateTime).getTime() >= withdrawlDate.getTime()){
							values.push(d.values[j]);
						}
					}
					return valueLine(values);
				}
			})
			.attr("id", "line-" + d.values[0].handle + "-dash")
			.attr("fill", "none")
			.style("opacity", 1)
			.attr("stroke", function(){
				return d.color = color(d.key);})
			.attr("stroke-width", 1.5)
			.attr("stroke-dasharray", "0")
			.on("click", function(){
					console.log("Clicked the text: " + i);
					highlightLabelGraph(d.values[0].handle);
			});
			
			dot.append("g")
				.attr("id", "scatter-" + d.values[0].handle)
				.attr("clip-path", "url(#clip)")
				.selectAll(".dot")
				.data(d.values)
				.enter().append("circle")
				.attr("class", "dot")
				.style("opacity", 1)
				.attr("r", 3)
				.attr("cy", function(d) {
					return yScale(d.FollowerCount);})
				.attr("cx", function(d) {
					return xScale(new Date(d.DateTime));})
				.style("fill", function() {
					return d.color = color(d.key);})
				.on("click", function(){
					console.log("Clicked the text: " + i);
					highlightLabelGraph(d.values[0].handle);
				})
				.on("mouseover", function(d) {	
					div.transition()		
						.duration(200)		
						.style("opacity", 0.9);		
					div.html("@" + d.handle + "<br/>" + "Memento: " + new Date(d.DateTime).toISOString().split("T")[0] + "<br/>" + "Follower: " + d3.format(",")(d.FollowerCount))	
						.style("left", (d3.event.pageX) + "px")		
						.style("top", (d3.event.pageY - 28) + "px");
				})					
				.on("mouseout", function(d) {		
					div.transition()		
						.duration(500)		
						.style("opacity", 0);	
				});
			
			svg.append("text")
				.attr("id", "label-" + d.values[0].handle)
				.attr("class", "label")
				.attr("transform", "translate("+(width - 30)+","+yScale(d.values[d.values.length - 1].FollowerCount)+")")
				.attr("dy", ".5em")
				.attr("text-anchor", "start")
				.style("opacity", 1)
				.style("fill", function() {
					return d.color = color(d.key); })
				.style("font", "20px times")
				.text("@" + d.values[0].handle)
				.on("click", function(){
					console.log("Clicked the text: " + i);
					highlightLabelGraph(d.values[0].handle);
				})
				
		} else {
			
			svg.select("#line-" + d.values[0].handle)
				.transition()
				.duration(750)
				.attr("d", function(){
					let withdrawlDate = returnWithdrawlDate(d.values[0].handle);
					let values = []
					if(typeof(withdrawlDate) == 'undefined'){
						return valueLine(d.values);
					}else{ 
						for(let j=0; j< d.values.length; j++){
							if(new Date(d.values[j].DateTime).getTime() <= withdrawlDate.getTime()){
								values.push(d.values[j]);
							}else{
								values.push(d.values[j]);
								break;
							}
						}
						return valueLine(values);
					}
				})
				
			svg.select("#line-" + d.values[0].handle + "-dash")
				.transition()
				.duration(750)
				.attr("d", function(){
					let withdrawlDate = returnWithdrawlDate(d.values[0].handle);
					let values = []
					if(typeof(withdrawlDate) != 'undefined'){
						for(let j=0; j< d.values.length; j++){
							if(new Date(d.values[j].DateTime).getTime() >= withdrawlDate.getTime()){
								values.push(d.values[j]);
							}
						}
						return valueLine(values);
					}
				});				


			svg.select("#label-" + d.values[0].handle)
				.transition()
				.duration(750)
				.attr("transform", "translate("+(width - 30)+","+yScale(d.values[d.values.length - 1].FollowerCount)+")");

			dot.select("#scatter-"+d.values[0].handle).selectAll("circle")
				.data(d.values)
				.transition()
				.duration(750)
				.attr("cx", function(d) {
				  return xScale(new Date(d.DateTime));})
				.attr("cy", function(d) {
				  return yScale(d.FollowerCount);})
				.style("fill", function() {
					return d.color = color(d.key);});

			//Enter new circles
			dot.select("#scatter-"+d.values[0].handle).selectAll("circle")
				.data(d.values)
				.enter()
				.append("circle")
				.style("opacity", 1)
				.attr("cy", function(d) {
					return yScale(d.FollowerCount);})
				.attr("cx", function(d) {
					return xScale(new Date(d.DateTime));})
				.attr("r", 3)
				.style("fill", function() {
					return d.color = color(d.key);})
				.on("click", function(){
					console.log("Clicked the text: " + i);
					highlightLabelGraph(d.values[0].handle);
				});

			// Remove old
			dot.select("#scatter-"+d.values[0].handle).selectAll("circle")
				.data(d.values)
				.exit()
				.remove();
		}
	});

}

/*Function to highlight and opaque line charts on click of labels*/
function highlightLabelGraph(handle){
	if ($("#line-" + handle).css("stroke-width") == "4px"){
		d3.select("#line-" + handle)
			.style("stroke-width",1.5);
		for(let i=0; i< unsortedCandidateList.length; i++){
			d3.select("#line-" + unsortedCandidateList[i] + "-dash")
				.style("stroke-dasharray", "0");
			d3.select("#line-" + unsortedCandidateList[i] + "-dash")
				.style("stroke-width", 1.5);
		}
		d3.select("#line-" + handle + "-minimap")
			.style("stroke-width", 1.5);
		var selectAllLines = $('.line');
		for (var i = 0, length = selectAllLines.length; i < length; i++) {
			if (selectAllLines[i].style.opacity != 0){
				d3.select(selectAllLines[i]).style("opacity", 1);
			}
		}
		var selectAllDots = $('.dot');
		for (var i = 0, length = selectAllDots.length; i < length; i++) {
			if (selectAllDots[i].style.opacity != 0){
				d3.select(selectAllDots[i]).style("opacity", 1);
			}
		}

		var selectAllText = $('.label');
		for (var i = 0, length = selectAllText.length; i < length; i++) {
			if (selectAllText[i].style.opacity != 0){
				d3.select(selectAllText[i]).style("opacity", 1);
			}
		}
		d3.selectAll(selectAllText)
			.style("font-weight", "normal");
		
		var selectAllAnouncement = $('.ancircle').not("#an-" + handle);
		for (var i = 0, length = selectAllAnouncement.length; i < length; i++) {
			if (selectAllAnouncement[i].style.opacity != 0){
				d3.select(selectAllAnouncement[i]).style("opacity", 1);
			}
		}
		
		var selectAllWithdrawl = $('.wcircle').not("#w-" + handle);
		for (var i = 0, length = selectAllWithdrawl.length; i < length; i++) {
			if (selectAllWithdrawl[i].style.opacity != 0){
				d3.select(selectAllWithdrawl[i]).style("opacity", 1);
			}
		}
		
		let selectDebatePoint = $('.debatepoint');
		for (var i = 0, length = selectDebatePoint.length; i < length; i++) {
			if (selectDebatePoint[i].style.opacity != 0){
				d3.select(selectDebatePoint[i]).style("opacity", 1);
			}
		}
		
		var selectPrimaryPoint = $('.primarypoint');
		for (var i = 0, length = selectPrimaryPoint.length; i < length; i++) {
			if (selectPrimaryPoint[i].style.opacity != 0){
				d3.select(selectPrimaryPoint[i]).style("opacity", 1);
			}
		}
		d3.select("#accountDeletion").style("opacity", 1);
	}else{
		d3.select("#line-" + handle + "-minimap")
			.style("stroke-width", 4);
		d3.select("#line-" + handle)
			.style("stroke-width", 4);
		d3.select("#line-" + handle)
			.style("opacity", 1);
		var selectAllLines = $('.line').not("#line-"+handle).not("#line-" + handle + "-dash");  
		for (var i = 0, length = selectAllLines.length; i < length; i++) {
			if (selectAllLines[i].style.opacity != 0){
				d3.select(selectAllLines[i]).style("opacity", 0.2);
			}
			d3.select(selectAllLines[i]).style("stroke-width", 1.5);
		}
		
		var selectAllDots = $('.dot').not("#scatter-"+handle);
		for (var i = 0, length = selectAllDots.length; i < length; i++) {
			if (selectAllDots[i].style.opacity != 0){
				d3.select(selectAllDots[i]).style("opacity", 0.2);
			}
		}
		d3.select("#label-" + handle)
			.style("font-weight", "bold");
		d3.select("#label-" + handle)
			.style("opacity", 1);
		var selectAllText = $('.label').not("#label-" + handle);
		for (var i = 0, length = selectAllText.length; i < length; i++) {
			if (selectAllText[i].style.opacity != 0){
				d3.select(selectAllText[i]).style("opacity", 0.2);
			}
			d3.select(selectAllText[i]).style("font-weight", "normal");
		}
		d3.select("#an-" + handle).style("opacity", 1);
		var selectAllAnouncement = $('.ancircle').not("#an-" + handle);
		for (var i = 0, length = selectAllAnouncement.length; i < length; i++) {
			if (selectAllAnouncement[i].style.opacity != 0){
				d3.select(selectAllAnouncement[i]).style("opacity", 0.2);
			}
		}
		d3.select("#w-" + handle).style("opacity", 1);
		var selectAllWithdrawl = $('.wcircle').not("#w-" + handle);
		for (var i = 0, length = selectAllWithdrawl.length; i < length; i++) {
			if (selectAllWithdrawl[i].style.opacity != 0){
				d3.select(selectAllWithdrawl[i]).style("opacity", 0.2);
			}
		}
		var selectDebatePoint = $('.debatepoint');
		for (var i = 0, length = selectDebatePoint.length; i < length; i++) {
			let temp = selectDebatePoint[i].id.split("-");
			if (temp[1] != handle && selectDebatePoint[i].style.opacity != 0){
				d3.select(selectDebatePoint[i]).style("opacity", 0.2);
			}else if(temp[1] == handle){
				d3.select(selectDebatePoint[i]).style("opacity", 1);
			}
		}
		var selectPrimaryPoint = $('.primarypoint');
		for (var i = 0, length = selectPrimaryPoint.length; i < length; i++) {
			let temp = selectPrimaryPoint[i].id.split("-");
			if (temp[1] != handle && selectPrimaryPoint[i].style.opacity != 0){
				d3.select(selectPrimaryPoint[i]).style("opacity", 0.2);
			}else if(temp[1] == handle){
				d3.select(selectPrimaryPoint[i]).style("opacity", 1);
			}
		}
		if(handle != "mikegravel"){
			d3.select("#accountDeletion").style("opacity", 0.2);
		}else{
			d3.select("#accountDeletion").style("opacity", 1);
		}
		if($("#w-" + handle).css("opacity") == 1){
			d3.select("#line-" + handle + "-dash")
				.style("stroke-dasharray", "10, 10");
			d3.select("#line-" + handle + "-dash")
				.style("stroke-width", 4);
			d3.select("#line-" + handle + "-dash")
				.style("opacity", 1);
		}else{
			d3.select("#line-" + handle + "-dash")
				.style("stroke-width", 4);
			d3.select("#line-" + handle + "-dash")
				.style("opacity", 1);
		}
	}
}

/*Function to return Candidate Debate List*/
function returnDebateList(debate = -1){
	// Debate List of Candidates
	var debateList = [["joebiden", "tulsigabbard", "berniesanders", "ewarren", "amyklobuchar", "petebuttigieg", 
					"michaelbennet", "andrewyang", "johndelaney", "corybooker", "marwilliamson", "juliancastro", 
					"kamalaharris", "betoorourke", "timryan", "billdeblasio", "sengillibrand", "jayinslee", 
					"hickenlooper", "ericswalwell"],
				["joebiden", "tulsigabbard", "berniesanders", "ewarren", "amyklobuchar", "petebuttigieg", 
					"michaelbennet", "andrewyang", "johndelaney", "corybooker", "marwilliamson", "juliancastro", 
					"kamalaharris", "governorbullock", "betoorourke", "timryan", "billdeblasio", "sengillibrand", 
					"jayinslee", "hickenlooper"],
				["joebiden", "berniesanders", "ewarren", "amyklobuchar", "petebuttigieg", "andrewyang", "corybooker", 
					"juliancastro", "kamalaharris", "betoorourke"],
				["joebiden", "tulsigabbard", "berniesanders", "ewarren", "amyklobuchar", "petebuttigieg", "tomsteyer", 
					"andrewyang", "corybooker", "juliancastro", "kamalaharris", "betoorourke"],
				["joebiden", "tulsigabbard", "ewarren", "amyklobuchar", "petebuttigieg", "tomsteyer", "andrewyang", 
					"corybooker", "kamalaharris", "berniesanders"],
				["joebiden", "berniesanders", "ewarren", "amyklobuchar", "petebuttigieg", "tomsteyer", "andrewyang"],
				["joebiden", "berniesanders", "ewarren", "amyklobuchar", "petebuttigieg", "tomsteyer"],
				["joebiden", "berniesanders", "ewarren", "amyklobuchar", "petebuttigieg", "tomsteyer", "andrewyang"],
				["joebiden", "berniesanders", "ewarren", "mikebloomberg", "amyklobuchar", "petebuttigieg"],
				["joebiden", "berniesanders", "ewarren", "mikebloomberg", "amyklobuchar", "petebuttigieg", "tomsteyer"],
				["joebiden", "berniesanders"]];
	if(debate == -1){
		return debateList;
	}else{
		return debateList[debate];
	}

}

/*Function to return Campaign Annoucement Dates*/
function returnCampaignAnnoucementDate(handle){
	var campaign;
	if (handle == "andrewyang"){
		campaign = new Date("2017- 11- 06");
	} else if (handle == "joebiden"){
		campaign = new Date("2019- 04- 25");
	} else if (handle == "berniesanders" | handle == "sensanders"){
		campaign =  new Date("2019- 02- 19");
	} else if (handle == "ewarren" | handle == "senwarren"){
		campaign = new Date("2019- 02- 09")
	}else if (handle == "petebuttigieg"){
		campaign = new Date("2019- 04- 14")
	}else if (handle == "governorbullock"){
		campaign = new Date("2019- 05- 01")
	}else if (handle == "marwilliamson"){
		campaign = new Date("2019- 01- 28")
	}else if (handle == "timryan"){
		campaign = new Date("2019- 04- 04")
	}else if (handle == "kamalaharris" | handle == "senkamalaharris"){
		campaign = new Date("2019- 01- 21")
	}else if (handle == "gillibrandny" | handle == "sengillibrand"){
		campaign = new Date("2019- 03- 17")
	}else if (handle == "amyklobuchar"){
		campaign = new Date("2019- 02- 10")
	}else if (handle == "juliancastro"){
		campaign = new Date("2019- 01- 12")
	}else if (handle == "billdeblasio"){
		campaign = new Date("2019- 05- 16")
	}else if (handle == "johndelaney" | handle == "repjohndelaney"){
		campaign = new Date("2017- 07- 28")
	}else if (handle == "tulsipress" | handle == "tulsigabbard"){
		campaign = new Date("2019- 01- 11")
	}else if (handle == "michaelbennet" | handle == "senatorbennet"){
		campaign = new Date("2019- 05- 02")
	}else if (handle == "waynemessam"){
		campaign = new Date("2019- 03- 28")
	}else if (handle == "joesestak"){
		campaign = new Date("2019- 06- 22")
	}else if (handle == "tomsteyer"){
		campaign = new Date("2019- 07- 09")
	}else if (handle == "senbooker" | handle == "senbookerofc" | handle == "corybooker"){
		campaign = new Date("2019- 02- 01")
	}else if (handle == "betoorourke" | handle == "repbetoorourke"){
		campaign = new Date("2019- 03- 14")
	}else if (handle == "hickenlooper"){
		campaign = new Date("2019- 03- 04")
	}else if (handle == "jayinslee"){
		campaign = new Date("2019- 03- 01")
	}else if (handle == "sethmoulton"){
		campaign = new Date("2019- 04- 22")
	}else if (handle == "ericswalwell" | handle == "repswalwell"){
		campaign = new Date("2019- 04- 08")
	}else if (handle == "mikegravel"){
		campaign = new Date("2019- 04- 02")
	}else if(handle == "mikebloomberg"){
		campaign = new Date("2019- 11- 29")
	}
	return campaign;
}

/*Function to return Campaign Withdrawl Dates*/
function returnWithdrawlDate(handle){
	var withdrawl;
	if (handle == "hickenlooper"){
		withdrawl = new Date("2019- 08- 15")
	}else if (handle == "mikegravel"){
		withdrawl = new Date("2019- 08- 06")
	}else if (handle == "berniesanders" | handle == "sensanders"){
		withdrawl = new Date("2020- 04- 08")
	}else if (handle == "tulsipress" | handle == "tulsigabbard"){
		withdrawl = new Date("2020- 03- 19")
	}else if (handle == "jayinslee"){
		withdrawl = new Date("2019- 08- 21")
	}else if (handle == "sethmoulton"){
		withdrawl = new Date("2019- 08- 23")
	}else if (handle == "ericswalwell" | handle == "repswalwell"){
		withdrawl = new Date("2019- 07- 08")
	}else if(handle == "ewarren"){
		withdrawl = new Date("2020- 03- 05")
	}else if(handle == "mikebloomberg"){
		withdrawl = new Date("2020- 03- 04")
	}else if(handle == "amyklobuchar"){
		withdrawl = new Date("2020- 03- 02")
	}else if(handle == "petebuttigieg"){
		withdrawl = new Date("2020- 03- 01")
	}else if(handle == "tomsteyer"){
		withdrawl = new Date("2020- 02- 29")
	}else if(handle == "michaelbennet"){
		withdrawl = new Date("2020- 02- 11")
	}else if(handle == "andrewyang"){
		withdrawl = new Date("2020- 02- 11")
	}else if(handle == "johndelaney"){
		withdrawl = new Date("2020- 01- 31")
	}else if(handle == "corybooker"){
		withdrawl = new Date("2020- 01- 13")
	}else if(handle == "marwilliamson"){
		withdrawl = new Date("2020- 01- 10")
	}else if(handle == "juliancastro"){
		withdrawl = new Date("2020- 01- 02")
	}else if(handle == "kamalaharris"){
		withdrawl = new Date("2019- 12- 03")
	}else if(handle == "governorbullock"){
		withdrawl = new Date("2019- 12- 02")
	}else if(handle == "joesestak"){
		withdrawl = new Date("2019- 12- 01")
	}else if(handle == "waynemessam"){
		withdrawl = new Date("2019- 11- 19")
	}else if(handle == "betoorourke"){
		withdrawl = new Date("2019- 11- 01")
	}else if(handle == "timryan"){
		withdrawl = new Date("2019- 10- 24")
	}else if(handle == "billdeblasio"){
		withdrawl = new Date("2019- 09- 20")
	}else if(handle == "sengillibrand"){
		withdrawl = new Date("2019- 08- 28")
	}
	return withdrawl;
}	

/*Function to return Debate Dates*/
function returnDebateInfo(debate =-1){
	var debateInfo = [{"date": new Date("2019-06-26"), "debate": "MSNBC Debate, Miami", "id": 1},
						{"date": new Date("2019-07-30"), "debate": "CNN Debate, Detroit", "id": 2},
						{"date": new Date("2019-09-12"), "debate": "ABC News Debate, Houston", "id": 3},
						{"date": new Date("2019-10-15"), "debate": "CNN Debate, Westerville", "id": 4},
						{"date": new Date("2019-11-20"), "debate": "MSNBC Debate, Atlanta", "id": 5},
						{"date": new Date("2019-12-19"), "debate": "PBS NewsHour Debate, Los Angeles", "id": 6},
						{"date": new Date("2020-01-14"), "debate": "CNN Debate, Des Moines", "id": 7},
						{"date": new Date("2020-02-07"), "debate": "ABC News Debate, Manchester, NH", "id": 8},
						{"date": new Date("2020-02-19"), "debate": "MSNBC Debate, Paradise", "id": 9},
						{"date": new Date("2020-02-25"), "debate": "CBS News Debate, Charleston", "id": 10},
						{"date": new Date("2020-03-15"), "debate": "CNN Debate, Washinton D.C.", "id": 11}];
	if(debate == -1){
		return debateInfo;
	}else{
		return debateInfo[debate];
	}
}

/*Function to return Primary and Caucus Information*/
function returnPrimaryInfo(id=-1){
	var caucusData = [{"date": new Date("2020-01-17"), "event": "Minnesota Primary", "id": 1},
					{"date": new Date("2020-02-03"), "event": "Iowa Caucus", "id": 2},
					{"date": new Date("2020-02-11"), "event": "New Hampshire Primary", "id": 3},
					{"date": new Date("2020-02-21"), "event": "Nevada Caucus", "id": 4},
					{"date": new Date("2020-02-29"), "event": "South Carolina Primary", "id": 5},
					{"date": new Date("2020-03-03"), "event": "Super Tuesday", "id": 6},
					{"date": new Date("2020-04-07"), "event": "Wisconsin Primary", "id": 7}];
	if(id == -1){
		return caucusData;
	}else{
		return caucusData[id];
	}
}

/* Function to add Twitter account deletion mark for @markgravel*/
function addAccountDeletionMark(){
	var temp = []
	for(i=0;i< dataset.length; i++){
		if(dataset[i].handle == "mikegravel")
			temp.push(dataset[i])
	}
	var mikeGravelDataset = temp[temp.length-1];
	if(typeof mikeGravelDataset != 'undefined' && d3.select("#accountDeletion").empty()){
		console.log(mikeGravelDataset);
		svg.append("rect")
			.attr("id", "accountDeletion")
			.attr("x", xScale(new Date(mikeGravelDataset.DateTime)))
			.attr("y", yScale(mikeGravelDataset.FollowerCount))
			.attr("width", 6)
			.attr("height", 6)
			.style("opacity", 1)
			.style("fill", "red")
			.on("mouseover", function() {		
				div.transition()		
					.duration(200)		
					.style("opacity", 0.9);		
				div.html("@" + mikeGravelDataset.handle + "<br/>" + "Date:" + new Date(mikeGravelDataset.DateTime).toISOString().split("T")[0] + "<br/>" + "Account Deleted")	
					.style("left", (d3.event.pageX) + "px")		
					.style("top", (d3.event.pageY - 28) + "px");
			})					
			.on("mouseout", function(d) {		
				div.transition()		
					.duration(500)		
					.style("opacity", 0);	
			});	
	}
}
