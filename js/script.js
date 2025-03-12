
console.log('D3 Version:', d3.version);

const margin = {top: 80, right: 60, bottom: 60, left: 100};
const pieMargin = 60
const width = 600 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;
const pieWidth = 600 - (pieMargin * 2);
const pieHeight = 400 - (pieMargin * 2);
let pieRadius = Math.min(width, height) / 2;

let allData = []
let groupedByType = []
const monthNames = [
    'null',
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
]
let currentVar = null

const svg = d3.select('#vis')
    .append('svg-container')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

const svgPie = d3.select('#vis')
    .append('svg-container')
    .append('svg')
    .attr('width', pieWidth + 2 * pieMargin)
    .attr('height', pieHeight + 2 * pieMargin)
    .append('g')
    .attr('transform', "translate(" + (pieWidth / 2 + pieMargin + 100) + "," + (pieHeight / 2 + pieMargin + 30) + ")");

let xScale = d3.scaleBand()
    .range([0, width])
    .padding(0.2);
let yScale = d3.scaleLinear()
    .range([height, 0]);

let xAxis = svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`) // Position at the bottom

let yAxis = svg.append("g")
    .attr("class", "axis")

let xAxisLabel = svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 20)
    .attr("text-anchor", "middle")
    .attr('class', 'labels')

let yAxisLabel = svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 40)
    .attr("text-anchor", "middle")
    .attr('class', 'labels')

let title = svg.append("text")
    .attr("x", width/2)
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .style("font-size", "26px")

let chartBackTip = svg.append("text")
    .attr("x", width/2)
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("click any bar to go back")
    .style("opacity", "0")
    .style("font-style", "italic")

let pieTitle = svgPie.append("text")
    .attr("x", -100)
    .attr("y", 0 - (pieHeight / 2) - 40)
    .attr("text-anchor", "middle")
    .style("font-size", "26px")

let yLegendNudge = 80

function init(){
    const dateParser = d3.timeParse("%m/%d/%Y %I:%M:%S %p");

    d3.csv("./data/chicago_crimes_2024.csv", 
    function(d){
        
        dt_object = dateParser(d.Date)

        return {  
            datetime: dateParser(d.Date),
            p: d3.timeFormat("%m")(dt_object),
            year: dt_object.getFullYear(),
            month: dt_object.getMonth() + 1, // getMonth() returns 0 based; adding 1 means Jan=1, Feb=2, etc
            type: d["Primary Type"]
        }
    })
    .then(data => {
            allData = data
            groupedByType = Array.from(d3.rollup(data, v => v.length, d => d.type), ([type, count]) => ({type, count}));
            groupedByMonth = Array.from(d3.rollup(data, v => v.length, d => d.month), ([month, count]) => ({month, count}));
            currentVar = "month"
            updateChart(groupedByMonth, "month", "count", d => monthNames[d], groupedByMonth.map(d => d.month), "Month", "Crime Counts", "#DC143C", "Chicago Crime Counts per Month in 2024")
            bakePie(groupedByType, "Chicago Crimes in 2024 by Type")
        })
    .catch(error => console.error('Error loading data:', error));
}

function bakePie(pieData, titleText) {

    data = JSON.parse(JSON.stringify(pieData)); // make deep copy to avoid modifying original data

    // the following code lumps the uncommon categories of the data into an "other" category;
    // specifically all of the categories that each make up less than 1% of the total data
    let totalRows = data.reduce((sum, row) => sum + row.count, 0);
    let threshold = totalRows * 0.01; // 1% threshold
    
    let compressedData = [];
    let otherCount = 0;
    
    data.forEach(row => {
        if (row.count >= threshold || row.type === "OTHER OFFENSE") {
            compressedData.push(row);
        } else {
            otherCount += row.count;
        }
    });
    
    let otherEntry = compressedData.find(row => row.type === "OTHER OFFENSE");
    if (otherEntry) {
        otherEntry.count += otherCount;
    } else if (otherCount > 0) {
        compressedData.push({ type: "OTHER OFFENSE", count: otherCount });
    }

    let color = d3.scaleOrdinal()
        .domain(compressedData)
        .range(d3.schemeSet3);

    compressedData.sort((a, b) => b.count - a.count);

    console.log(compressedData)

    let pie_maker = d3.pie().value(function(d) { return d.count; });
    let pied_data = pie_maker(compressedData)
    let arcGenerator = d3.arc()
    .innerRadius(0)
    .outerRadius(pieRadius)
    let arcHover = d3.arc()
    .innerRadius(0)
    .outerRadius(pieRadius + 20)
    let arcInitial = d3.arc()
    .innerRadius(0)
    .outerRadius(1)

    // get rid of any existing pie slices
    svgPie.selectAll('path')
        .transition()
        .duration(300)
        .attr('d', arcInitial)
        .remove()

    // and get rid of the legend title; it will be replaced
    svgPie.select('.legendTitle').remove();

    pieTitle.text(titleText)

    // make new slices
    svgPie.selectAll('slices')
    .data(pied_data)
    .join(
        function(enter) {
            return enter.append('path')
                .attr("d", arcInitial)
                .attr('fill', function(d){ return(color(d.data.type)) })
                .attr("stroke", "black")
                .style("stroke-width", "2px")
                .style("opacity", 0.7)
                .on("mouseover", function (event, d) {
                    d3.select('#tooltip')
                            .style("display", 'block')
                            .html(
                            `<strong>TYPE: ${d.data.type}</strong><br/>
                            Total Count: ${d.data.count}<br/>
                            Percent of Crimes: ${(Math.round((d.data.count / totalRows) * 10000) / 100).toFixed(2)}%`)
                            .style("left", (event.pageX + 20) + "px")
                            .style("top", (event.pageY - 28) + "px");

                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr("d", arcHover)
                })
                .on("mouseout", function (event, d) {
                    d3.select('#tooltip')
                            .style("display", 'none')

                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr("d", arcGenerator)
                })
                .transition()
                .delay(function (d, i) {
                    return i * 30
                })
                .attr('d', arcGenerator)
        },
        function(update) {
            return update.transition()
            .duration(500)
            .attr('d', arcGenerator)
        },
        function(exit) {
            return exit
            .transition()
            .duration(300)
            .attr('d', arcInitial)
            .remove()
        }
    )

    // legend icons
    svgPie.selectAll(".legendCircle")
    .data(pied_data)
    .join(
        function(enter) {
            return enter.append('circle')
            .attr('class', 'legendCircle')
            .attr("cy", function(d, i) {
                return i * 25 - pieMargin - (pieHeight / 2) + (yLegendNudge - 5)
            })
            .attr("cx", 0 - (pieMargin * 2) - (pieWidth / 2) - 15)  
            .attr('fill', function(d){ return(color(d.data.type)) })
            .attr("r", "5px")
            .attr("stroke", "black")
            .style("stroke-width", "1px")
        },
        function(update) {
            return update
            .transition()
            .duration(300)
            .attr("cy", function(d, i) {
                return i * 25 - pieMargin - (pieHeight / 2) + (yLegendNudge - 5)
            })
            .attr('fill', function(d){ return(color(d.data.type)) })
        },
        function(exit) {
            return exit
            .transition()
            .duration(300)
            .attr('r', "0px")
            .remove()
        }
    )

    // legend title
    svgPie.append('text')
        .attr('class', 'legendTitle')
        .attr("y", 0 - pieMargin - (pieHeight / 2) + (yLegendNudge - 25))
        .attr("x", 0 - (pieMargin * 2) - (pieWidth / 2) - 25)  
        .style('fill', 'black')
        .text('Crime Type')
        .attr("text-anchor", "left")
        .style('font-size', '15px')

    // legend text
    svgPie.selectAll(".legendText")
    .data(pied_data)
    .join(
        function(enter) {
            return enter.append('text')
            .attr('class', 'legendText')
            .attr("y", function(d, i) {
                return i * 25 - pieMargin - (pieHeight / 2) + yLegendNudge
            })
            .attr("x", 0 - (pieMargin * 2) - (pieWidth / 2))  
            .style('fill', 'black')
            .text(d => d.data.type)
            .attr("text-anchor", "left")
            .style('font-size', '13px')
        },
        function(update) {
            return update
            .transition()
            .duration(300)
            .attr("y", function(d, i) {
                return i * 25 - pieMargin - (pieHeight / 2) + yLegendNudge
            })
            .text(d => d.data.type)
        },
        function(exit) {
            return exit
            .transition()
            .duration(300)
            .attr('font-size', "0px")
            .remove()
        }
    )

}

function updateChart(currentData, xVarName, yVarName, xTickLabel, xDomain, xLabel, yLabel, barColor, titleText){

    xScale.domain(xDomain)
    xAxis.call(d3.axisBottom(xScale).tickFormat(xTickLabel))

    yScale.domain([0, d3.max(currentData, d => d[yVarName])])
    yAxis.call(d3.axisLeft(yScale))

    xAxisLabel.text(xLabel)
    yAxisLabel.text(yLabel)
    title.text(titleText)

    svg.selectAll('rect')
    .data(currentData, d => d[xVarName])
    .join(
        function(enter){
            return enter
            .append('rect')
            .attr('class', 'bars')
            .attr('x', d => xScale(d[xVarName]))
            .attr('y', height)
            .attr("width", xScale.bandwidth())
            .attr("height", 0)
            .attr("fill", barColor)
            .on("click", function(event, d) {
                if (currentVar === "month") {
                    // switch to day view
                    d3.select(this)
                    .transition()
                    .duration(400)
                    .attr("fill", "#F07223")
                    .on("end", (event, s) => {
                        let dailyData = Array.from(aggregateByDay(allData, d.month), ([day, count]) => ({ day, count }));
                        updateChart(dailyData, "day", "count", d => d, dailyData.map(d => d.day), "Day of " + monthNames[d.month], "Crime Counts", "#F07223", "Chicago Crime Counts per Day in " + monthNames[d.month] + " 2024")
                        let dailyPie = getGroupedByTypeForMonth(d.month);
                        bakePie(dailyPie, `Chicago Crimes in ${monthNames[d.month]} 2024 by Type`)
                        currentVar = "day"
                        chartBackTip.transition().duration(1000).style("opacity", "0.5")
                    })
                } else if (currentVar == "day") {
                    updateChart(groupedByMonth, "month", "count", d => monthNames[d], groupedByMonth.map(d => d.month), "Month", "Crime Counts", "#DC143C", "Chicago Crime Counts per Month in 2024")
                    bakePie(groupedByType, "Chicago Crimes in 2024 by Type")
                    currentVar = "month"
                    chartBackTip.transition().duration(500).style("opacity", "0")
                }
            })
            .transition().duration(1000)
            .attr("y", d => yScale(d[yVarName]))
            .attr("height", d => height - yScale(d[yVarName]));
        },
        function(update){
            return update
            .attr("x", d => xScale(d[xVarName]))
            .attr("y", d => yScale(d[yVarName]))
            .attr("height", d => height - yScale(d[yVarName]))
            .attr("width", xScale.bandwidth());
        },
        function(exit){
            return exit
            .transition()
            .duration(500)
            .attr('height', 0)
            .attr('y', height)
            .remove()
        }
    )
    
}

function aggregateByDay(data, month) {
    return d3.rollup(data.filter(d => d3.timeFormat("%m")(d.datetime) == month), 
        v => v.length, 
        d => d3.timeFormat("%d")(d.datetime) // Extract day of month
    );
}

function getGroupedByTypeForMonth(month) {
    filtered = allData.filter(d => d3.timeFormat("%m")(d.datetime) == month);
    return Array.from(d3.rollup(filtered, v => v.length, d => d.type), ([type, count]) => ({type, count}));
}

window.addEventListener('load', init);