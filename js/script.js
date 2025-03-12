
console.log('D3 Version:', d3.version);

const margin = {top: 80, right: 60, bottom: 60, left: 100};
const width = 600 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;
let pieRadius = Math.min(width, height) / 2

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
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', "translate(" + (width / 2 + margin.right) + "," + (height / 2 + margin.top) + ")");

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
    .style("font-size", "24px")

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
            console.log(groupedByMonth)
            currentVar = "month"
            updateChart(groupedByMonth, "month", "count", d => monthNames[d], groupedByMonth.map(d => d.month), "Month", "Crime Counts", "#DC143C", "Chicago Crime Counts per Month in 2024")
            bakePie()
        })
    .catch(error => console.error('Error loading data:', error));
}

function bakePie() {
    let color = d3.scaleOrdinal()
        .domain(groupedByType)
        .range(d3.schemeSet2);

    let pie_maker = d3.pie().value(function(d) { return d.count; });
    let pied_data = pie_maker(groupedByType)
    console.log(pied_data)
    let arcGenerator = d3.arc()
    .innerRadius(0)
    .outerRadius(pieRadius)

    svgPie.selectAll('slices')
    .data(pied_data)
    .enter()
    .append('path')
        .attr('d', arcGenerator)
        .attr('fill', function(d){ return(color(d.data.type)) })
        .attr("stroke", "black")
        .style("stroke-width", "2px")
        .style("opacity", 0.7)
}

function updateChart(currentData, xVarName, yVarName, xTickLabel, xDomain, xLabel, yLabel, barColor, titleText){
    // svg.selectAll('.axis').remove()
    // svg.selectAll('.labels').remove()

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
        // When we have new data points
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
                        currentVar = "day"
                    })
                } else if (currentVar == "day") {
                    updateChart(groupedByMonth, "month", "count", d => monthNames[d], groupedByMonth.map(d => d.month), "Month", "Crime Counts", "#DC143C", "Chicago Crime Counts per Month in 2024")
                    currentVar = "month"
                }
            })
            .transition().duration(1000)
            .attr("y", d => yScale(d[yVarName]))
            .attr("height", d => height - yScale(d[yVarName]));
        },
        // Update existing points when data changes
        function(update){
            return update
            .attr("x", d => xScale(d[xVarName]))
            .attr("y", d => yScale(d[yVarName]))
            .attr("height", d => height - yScale(d[yVarName]))
            .attr("width", xScale.bandwidth());
        },
        // Remove points that no longer exist in the filtered data 
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

// function addLegend(){
// // Adds a legend so users can decode colors
//     let size = 10  // Size of the legend squares

//     // Your turn, draw a set of rectangles using D3
//     svg.selectAll('continentSquare')
//     .data(continents)
//     .join(
//         function(enter) {
//             return enter
//             .append('rect')
//             .attr('x', function(d, i) { return i * (size + 100) + 100})
//             .attr('y', -margin.top/2)
//             .attr('width', size)
//             .attr('height', size)
//             .style('fill', d => colorScale(d))
//         }
//     )

//     svg.selectAll("continentName")
//         .data(continents)
//         .enter()
//         .append("text")
//         .attr("y", -margin.top/2 + size) // Align vertically with the square
//         .attr("x", (d, i) => i * (size + 100) + 120)  
//         .style("fill", d => colorScale(d))  // Match text color to the square
//         .text(d => d) // The actual continent name
//         .attr("text-anchor", "left")
//         .style('font-size', '13px')
//     // data here should be "continents", which we've defined as a global variable
//     // the rect's y could be  -margin.top/2, x could be based on i * (size + 100) + 100
//     // i is the index in the continents array
//     // use "colorScale" to fill them; colorScale is a global variable we defined, used in coloring bubbles
//     .style("fill", d => colorScale(d))
// }

window.addEventListener('load', init);