let maxHour = 0;
let tooltipChart = d3.select('body').append('div')
    .attr('class', 'hidden tooltip');
let tooltipPhone = d3.select('body').append('div')
    .attr('class', 'hidden tooltip');

let colors = {
    "Reseaux sociaux": '#ff4a4a',
    "Divertissement": '#f25cff',
    "Utilitaire": '#347EB4',
    "Jeux": '#BCD32F',
    "Voyage": '#75EDB8',
    "Creativite": '#89EE4B',
    "Achats": '#AD4FE8',
    "Finance": '#D5AB61',
    "Autre": '#8a3111'
};

/** Pour les catégories, il faudrait potentiellement ajouter celles qui manquent. On suit les mêmes que le téléphone ?**/
let cat = ['Reseaux sociaux', 'Divertissement', 'Utilitaire', 'Jeux', 'Voyage', 'Creativite', 'Achats', 'Finance'];


/** dayAndTime contient à chaque indice un objet de type {jour: la date, temps: le temps total d'activité **/
let dayAndTime = [];


/** dayAndCatTime contient des objets de type :
    {date du jour: [{categorie 1: temps total pour ce jour pour cette categorie}, {categorie 2: temps total pour ce jour
    pour cette categorie}, ...] **/
let dayAndCatTime = {};

/**  **/
let catAndApp = {};
let listEvent = [];
let catTime = []


let user = "leo";

let dataset = [];

processData();

/** Traitement des données en remplissant les différentes structures de données nécessaires. Permet de charger les données
 * qu'une fois. Appel de la fonction drawChart à la fin de la promesse afin d'être sûr que les structures
 * de données soient bien remplies. **/
function processData() {
    d3.csv(`data/${user}.csv`).then((data) => {
        let tmp = [];
        let dayTreated = [];
        for (let i = 0; i < data.length; i++) {
            if (tmp.indexOf(data[i].jour) === -1) {
                tmp.push(data[i].jour);
                dayAndTime.push({
                    jour: data[i].jour,
                    time: computeHour(parseInt(data[i].heures_totales), parseInt(data[i].minutes_totales))
                });
            }
            if(data[i].Evenement != "" && ! dayTreated.includes(data[i].jour)) {
                listEvent.push([data[i].jour, data[i].Evenement])
                dayTreated.push(data[i].jour)
            }
        }
        for (let i = 0; i < dayAndTime.length; i++) {
            dayAndCatTime[dayAndTime[i].jour] = [];
            for (let c of cat) {
                let tmp = timeForCat(c, dayAndTime[i].jour, data);
                dayAndCatTime[dayAndTime[i].jour].push({
                    cat: c,
                    temps: tmp[0],
                    app: tmp[1]
                });
            }
        }
        let first = true
        for(let arr in dayAndCatTime) {
            if(first) {
                for(let i = 0; i < cat.length; i++) {
                    catTime.push({cat: dayAndCatTime[arr][i].cat, temps:dayAndCatTime[arr][i].temps})
                }
                first = false
            }
            else {
                for(let i = 0; i < cat.length; i++) {
                    catTime[i].temps += dayAndCatTime[arr][i].temps
                }
            }
        }

        const NUM_OF_SIDES = 8;
        NUM_OF_LEVEL = 4,
        size = Math.min( window.innerWidth, window.innerHeight, 150 ),
        offset = Math.PI,
        polyangle = ( Math.PI * 2 ) / NUM_OF_SIDES,
        r = 0.8 * size,
        r_0 = r / 2,
        center = {
            x: size / 2,
            y: size / 2
        };

        const ticks = genTicks( NUM_OF_LEVEL );
        dataset = generateData( NUM_OF_SIDES );

        const wrapper = d3.select( ".chart" )
            .append( "svg" )
            .attr( "width", size )
            .attr( "height", size );


        drawPhone(catAndTimeForDay(data[0].jour), data[0].jour)
        drawChart(data);
        
        generateAndDrawLevels( NUM_OF_LEVEL, NUM_OF_SIDES );
        generateAndDrawLines( NUM_OF_SIDES );
        drawData( dataset, NUM_OF_SIDES );
        drawLabels( dataset, NUM_OF_SIDES );
    }).then( () => {
        if (!$.fn.DataTable.isDataTable('#event')) {
            $('#event').DataTable({
                data: listEvent,
                columns: [
                    {title: "Jour"},
                    {title: "Evenement"}
                ],
                searching: false,
                paging: false,
                info: false,
                "rowCallback": function (row, data) {
                    $(row).hover(function () {
                        drawPhone(catAndTimeForDay(data[0]), data[0])
                        d3.select("#chartVisu").selectAll("rect")
                        .filter(function(d) {
                            if(d.data.date == data[0])
                            handleOpacity(d)
                        })
                    })
                }
            });
        } else {
            $('#event').DataTable().clear().rows.add(listEvent).draw();
        }
    });
}

function drawPhone(val, day) {
    let tmp = dayAndTime.find(elem => elem.jour === day );
    let time = reverseHour(tmp.time);
    displayStatusOnPhone(day, time[0], time[1]);

    const margin = {top: 100, right: 30, bottom: 100, left: 30},
        width = 356 - margin.left - margin.right,
        height = 650 - margin.top - margin.bottom;

    d3.select("#panels #leftPanel #svg").selectAll('*').remove();

    let svg = d3.select("#panels #leftPanel #svg")
        .append("svg")
        .attr("id", "svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            `translate(${margin.left}, ${margin.top})`);

    let data = {
        name: 'Origin',
        children: []
    };

    for (let l of val) {
        data.children.push({
            name: l.cat,
            children: l.app
        });
    }

    let root = d3.hierarchy(data).sum((d) => d.value);

    d3.treemap()
        .size([width, height])
        .padding(2)
        (root)

    const colorScale = d3.scaleOrdinal() // the scale function
        .domain(Object.keys(colors)) // the data
        .range(Object.values(colors))    // the way the data should be shown

    svg
        .selectAll("rect")
        .data(root.leaves())
        .join("rect")
        .attr('x', (d) => d.x0)
        .attr('y', (d) => d.y0)
        .attr('width', (d) => d.x1 - d.x0)
        .attr('height', (d) => d.y1 - d.y0)
        .on('mouseover', (e, d) => {
            let mousePosition = [e.x, e.y];
            tooltipPhone.classed('hidden', false)
                .attr('style', 'left:' + (mousePosition[0] + 15) +
                    'px; top:' + (window.scrollY + mousePosition[1] - 35) + 'px; border: 1px solid')
                .html(`Application : ${d.data.name}</br>Temps : ${reverseHour(d.data.value)[0]}h${reverseHour(d.value)[1]}`)
        })
        .on('mouseout', () => {
            tooltipPhone.classed('hidden', true);
        })
        .style("stroke", "black")
        .style("fill", (d) => {
            return colorScale(d.parent.data.name);
        });

    svg
        .selectAll("text")
        .data(root.leaves())
        .join("text")
        .selectAll("tspan")
        .data(d => d)
        .enter()
        .append("tspan")
        .attr("x", (d) => {return d.x0 + 5})
        .attr("y", (d, i) => d.y0 + 15 + (i * 10))       // offset by index
        .text((d) => {
            if (d.value > 0.1) {
                return `${d.data.name}`;
            }
        })
        .attr("font-size", "15px")
        .attr("fill", "white")
        .append("tspan")
        .attr("x", (d) => {return d.x0 + 5})
        .attr("y", (d, i) => d.y0 + 30 + (i * 10))       // offset by index
        .text((d) => {
            if (d.value > 0.1) {
                let t = reverseHour(d.value);
                return `${t[0]}h${t[1]}`;
            }
        })
        .attr("font-size", "15px")
        .attr("fill", "white");
}

function handleOpacity(d) {
    d3.select("#chartVisu").selectAll("rect")
                    .filter(function(rect) {
                            if(d.data.date == rect.data.date)
                                return 0;
                            return 1;
                            })
                            .attr("opacity", 0.3)
    d3.select("#chartVisu").selectAll("rect")
                    .filter(function(rect) {
                        if(d.data.date == rect.data.date)
                                return 1;
                            return 0;
                    })
                    .attr("opacity", 1)
}

const generateData = ( length ) => {
    let data = [];
    let tot = 0;
    for(let i = 0; i < catTime.length; i++) {
        tot += catTime[i].temps
    }
    for ( let i = 0; i < length; i++ ) {
        data.push({
            name: catTime[i].cat,
            value: catTime[i].temps / tot * 100 + 30
        });
    }
    return data;
};

const genTicks = levels => {
    const ticks = [];
    const step = 100 / levels;
    for ( let i = 0; i <= levels; i++ )
    {
        const num = step * i;
        if ( Number.isInteger( step ) )
        {
            ticks.push( num );
        }
        else
        {
            ticks.push( num.toFixed( 2 ) );
        }


    }

    return ticks;
};

const generatePoint = ( { length, angle } ) => {
    const point = {
        x: center.x + ( length * Math.sin( offset - angle ) ),
        y: center.y + ( length * Math.cos( offset - angle ) )
    };
    return point;
};

const drawPath = ( points, parent ) => {
    const lineGenerator = d3.line()
        .x( d => d.x )
        .y( d => d.y );

    parent.append( "path" )
        .attr( "d", lineGenerator( points ) );
};

const generateAndDrawLevels = ( levelsCount, sideCount ) => {
    const g = d3.select( "svg" ).append( "g" );
    for (let level = 1; level <= levelsCount; level++) {
        const hyp = ( level / levelsCount ) * r_0;

        const points = [];
        for (let vertex = 0; vertex < sideCount; vertex++) {
            const theta = vertex * polyangle;

            points.push( generatePoint( { length: hyp, angle: theta } ) );

        }
        const group = g.append( "g" ).attr( "class", "levels" );
        drawPath( [ ...points, points[ 0 ] ], group );
    }


};

const generateAndDrawLines = ( sideCount ) => {
    const g = d3.select( "svg" ).append( "g" );
    const group = g.append( "g" ).attr( "class", "grid-lines" );
    for (let vertex = 1; vertex <= sideCount; vertex++) {
        const theta = vertex * polyangle;
        const point = generatePoint( { length: r_0, angle: theta } );

        drawPath( [ center, point ], group );
    }

};

const drawCircles = points => {
    const tooltip = d3.select( ".tooltip" );
    const g = d3.select( "svg" ).append( "g" );
    const mouseEnter = (e,d) => {
        tooltip.style( "opacity", 1 );
        const x = d.x;
        const y = d.y
        // const { x, y } = e.x, e.y;
        tooltip.style( "top", `${ y - 20 }px` );
        tooltip.style( "left", `${ x + 15 }px` );
        tooltip.text(`${(d.value-30).toFixed(1)}%`);
    };

    const mouseLeave = d => {
        tooltip.style( "opacity", 0 );
    };

    g.append( "g" )
        .attr( "class", "indic" )
        .selectAll( "circle" )
        .data( points )
        .enter()
        .append( "circle" )
        .attr( "cx", d => d.x )
        .attr( "cy", d => d.y )
        .attr( "r", 3 )
        .on( "mouseenter", mouseEnter )
        .on( "mouseleave", mouseLeave );

};

const drawText = ( text, point, isAxis, group ) => {
    if (isAxis) {
        const xSpacing = text.toString().includes( "." ) ? 30 : 22;
        group.append( "text" )
            .attr( "x", point.x - xSpacing )
            .attr( "y", point.y + 5 )
            .html( text )
            .style( "text-anchor", "middle" )
            .attr( "fill", "darkgrey" )
            .style( "font-size", "12px" )
            .style( "font-family", "sans-serif" );
    } else {
        group.append( "text" )
            .attr( "x", point.x )
            .attr( "y", point.y )
            .html( text )
            .style( "text-anchor", "middle" )
            .attr( "fill", "darkgrey" )
            .style( "font-size", "12px" )
            .style( "font-family", "sans-serif" );
    }
};

const drawData = ( dataset, n ) => {
    const g = d3.select( "svg" ).append( "g" );
    const points = [];
    const scale = d3.scaleLinear()
        .domain( [ 0, 100 ] )
        .range( [ 0, r_0 ] )
        .nice();
    dataset.forEach( ( d, i ) => {
        const len = scale( d.value );
        const theta = i * ( 2 * Math.PI / n );
        points.push(
            {
                ...generatePoint( { length: len, angle: theta } ),
                value: d.value
            });
    });

    const group = g.append( "g" ).attr( "class", "shape" );

    drawPath( [ ...points, points[ 0 ] ], group );
    drawCircles( points );
};

const drawLabels = ( dataset, sideCount ) => {
    const g = d3.select( "svg" ).append( "g" );
    const groupL = g.append( "g" ).attr( "class", "labels" );
    for ( let vertex = 0; vertex < sideCount; vertex++ ) {

        const angle = vertex * polyangle;
        const label = dataset[ vertex ].name;
        const point = generatePoint( { length: 0.9 * ( size / 2 ), angle } );

        drawText( label, point, false, groupL );
    }
};

function drawChart(data) {
    d3.select("#panels #rightPanel #chartVisu").selectAll('*').remove();

    const margin = {top: 30, right: 30, bottom: 70, left: 60},
        width = 800 - margin.left - margin.right,
        height = 670 - margin.top - margin.bottom;

    let color = d3.scaleOrdinal()
        .domain(Object.keys(colors))
        .range(Object.values(colors))

    let arrData = [];

    for (let elem in dayAndCatTime) {
        let tmp = {};
        for (let x in dayAndCatTime[elem]) {
            tmp[dayAndCatTime[elem][x].cat] = dayAndCatTime[elem][x].temps;
            tmp['date'] = elem;
        }
        arrData.push(tmp);
    }

    let stackedData = d3.stack()
        .keys(cat)
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetNone)
        (arrData);

    const svg = d3.select("#chartVisu")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
        .range([ 0, width ])
        .domain(data.map(d => d.jour))
        .padding(0.5);

    let x_axis = d3.axisBottom()
        .scale(x)
        .tickFormat(d => {
            let date = convertToDate(d);
            if (!(date.getDay() === 0) && !(date.getDay() === 6) && !(date.getDay() === 1)) {
                return String.fromCodePoint(0x1F4C5);
            } else if (date.getDay() === 1) {
                let tmpD = d.split("/");
                return `${tmpD[0]}/${tmpD[1]}`;
            } else {
                return String.fromCodePoint(0x1F193);
            }
        })

    svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0, ${height})`)
        .call(x_axis)
        .selectAll("text")
        .attr("transform", "translate(-12,10)rotate(-90)")
        .style("text-anchor", "end")
        .filter(function(d) {
            for (let i = 0; i < listEvent.length; i++) {
                if (d == listEvent[i][0])
                    return 1
            }
            return 0;
        })
        .style('fill', 'darkOrange');

    const y = d3.scaleLinear()
        .domain([0, maxHour+1])
        .range([height, 0]);

    svg.append("g")
        .call(d3.axisLeft(y));

    svg.append("g")
        .selectAll("g")
        .data(stackedData)
        .enter().append("g")
            .attr("fill", (d) =>  color(d.key))
            .selectAll("rect")
            .data((d) => d)
            .enter().append("rect")
                .attr("x", (d) => x(d.data.date))
                .attr("y", (d) => y(d[1]))
                .attr("height", (d) => y(d[0]) - y(d[1]))
                .attr("width",x.bandwidth())
                .on('mousemove', (e, d) => {
                    let mousePosition = [e.x, e.y];
                    let time = 0;
                    for (let x in dayAndTime) {
                        if (dayAndTime[x].jour == d.data.date) {
                            time = reverseHour(dayAndTime[x].time);
                            break;
                        }
                    }
                    handleOpacity(d)
                    drawPhone(catAndTimeForDay(d.data.date), d.data.date);
                    tooltipChart.classed('hidden', false)
                        .attr('style', 'left:' + (mousePosition[0] + 15) +
                            'px; top:' + (window.scrollY + mousePosition[1] - 35) + 'px')
                        .html(`Temps total : ${time[0]} heures et ${time[1]} minutes`);
                })
                .on('mouseout', () => {
                    tooltipChart.classed('hidden', true);
                });
}

function update(newMembers) {
    user = newMembers;
    $('#img').attr('src', `data/avatars/${user}.png`)
    $('#name').text(user[0].toUpperCase() + user.slice(1));
    clearData();
    processData();
}

function displayStatusOnPhone(jour, hour, min) {
    $("#phoneDate").html(`Date : ${jour}`);
    $('#phoneTime').html(`Temps total : ${hour}h${min}`);
}


function computeHour(h, m) {
    let newH = m / 60;
    let val = h + newH;
    if (maxHour === 0 || maxHour < val) {
        maxHour = val;
    }
    return h + (m / 60);
}

function reverseHour(h) {
    if (h > 0) {
        let s = h.toString().split('.');
        let resM = 0;
        if (s.length > 1) {
            let minutes = "0." + s[1];
            resM = Math.round(minutes * 60);
            if (resM < 10) resM = "0" + resM;
        }
        return [Math.floor(h), resM];
    } else {
        return [0, "00"];
    }
}

function timeForCat(cat, day, data) {
    let f = data.filter((item) => {
        return item.jour === day && item.categorie.toUpperCase() === cat.toUpperCase();
    });
    let res = 0;
    let resCat = [];
    f.forEach(elem => {
        let val = computeHour(parseInt(elem.heures_application), parseInt(elem.minutes_application))
        res += val;
        resCat.push({
            name: elem.applications,
            value: val
        });
    });
    return [res, resCat];
}

function catAndTimeForDay(day) {
    let arrData = [];
    for (let v of dayAndCatTime[day]) {
        arrData.push({
            cat: v.cat,
            temps: reverseHour(v.temps),
            app: v.app
        });
    }
    arrData.sort((a,b) => computeHour(b.temps[0], b.temps[1])-computeHour(a.temps[0], a.temps[1]))
    return arrData;
}

function convertToDate(dateString) {
    let d = dateString.split("/");
    return new Date(d[2] + '/' + d[1] + '/' + d[0]);
}

function clearData() {
    listEvent = [];
    $('#event').DataTable().clear();
    dayAndCatTime = {};
    dayAndTime = [];
    d3.select( "svg" ).remove();
    dataset = [];
}
