var TimeChart;
var getTimeBounds;

(function() {
  function getInnerBounds(series, prop) {
    return [
      d3.max([d3.min([d[prop] for (d of s.data)]) for (s of series)]),
      d3.min([d3.max([d[prop] for (d of s.data)]) for (s of series)])
    ]
  }

  function getBounds(series, prop) {
    return [
      d3.min([d3.min([d[prop] for (d of s.data)]) for (s of series)]),
      d3.max([d3.max([d[prop] for (d of s.data)]) for (s of series)])
    ]
  }

  getTimeBounds = function(series) {
    return getBounds(series, "time");
  }

  function appendLine(selection, x1, y1, x2, y2, cls) {
    var line = selection.append("svg:line")
                        .attr("x1", x1)
                        .attr("x2", x2)
                        .attr("y1", y1)
                        .attr("y2", y2);
    if (cls)
      line.attr("class", cls);
    return line;
  }

  TimeChart = function(element, options) {
    options = options || {};

    this._palette = options.palette || d3.scale.category10();
    this._paletteCount = 0;
    this._width = options.width || 800;
    this._height = options.height || 600;

    var extents = [new Date(options.minTime * 1000), new Date(options.maxTime * 1000)];
    this._timeScale = d3.time.scale().domain(extents).range([0, this._width]);

    var margin = options.margin || 40;

    d3.select(element).html("");

    this._graph = d3.select(element)
                    .append("svg:svg")
                    .attr("viewBox", "0 0 " + (this._width + margin * 2) + " " + (this._height + margin * 2))
                    .append("svg:g")
                    .attr("transform", "translate(" + margin + "," + margin + ")");

    var border = this._graph.append("svg:g")
                            .attr("class", "chart-border");

    appendLine(border, 0, 0, 0, this._height, "left");
    appendLine(border, this._width, 0, this._width, this._height, "right");
    appendLine(border, 0, 0, this._width, 0, "top");
    appendLine(border, 0, this._height, this._width, this._height, "bottom");

    this._graph.append("svg:g")
               .attr("class", "chart-axis");

    this._graph.append("svg:g")
               .attr("class", "chart-data");

    this._drawXAxis();
  }

  TimeChart.prototype = {
    _width: null,
    _height: null,
    _palette: null,

    _paletteCount: null,

    _timeScale: null,
    _graph: null,

    addLineSeries: function(series, options) {
      options = options || {};

      var bounds = getBounds(series, "value");

      var scale = d3.scale.linear().domain(bounds).nice().range([this._height, 0]);
      var palette = this._palette;
      var seriesKey = options.seriesKey || (d => { return d.id });
      var seriesData = options.seriesData || (d => { return d.data });

      this._graph.select(".chart-data")
                 .selectAll(".chart-series")
                 .data(series, seriesKey)
                 .enter()
                 .append("svg:g")
                 .attr("id", d => { return "chart-series-" + seriesKey(d) })
                 .attr("class", "chart-series")
                 .attr("color", function(d) { return palette(Array.prototype.indexOf.call(this.parentNode.childNodes, this)) })
                 .append("svg:path")
                 .attr("class", "chart-line")
                 .datum(seriesData)
                 .attr("d", d3.svg.line()
                                  .x(d => { return this._timeScale(new Date(d["time"] * 1000)) })
                                  .y(d => { return scale(d["value"]) })
                                  .interpolate(options.interpolate || "basis"));

      return scale;
    },

    _drawXAxis: function() {
      var scale = this._timeScale;

      var box = this._graph.select(".chart-axis")
                           .append("svg:g")
                           .attr("class", "bottom")
                           .attr("transform", "translate(0," + this._height + ")");
      var y2 = 10;

      var ticks = scale.ticks();
      var formatter = scale.tickFormat();

      for (var t of ticks) {
        var x = scale(t);
        appendLine(box, x, 0, x, y2);
        box.append("svg:text")
           .attr("text-anchor", "middle")
           .attr("x", x)
           .attr("y", y2 * 1.5)
           .attr("dy", "1em")
           .html(formatter(t));
      }
    },

    drawAxis: function(scale, options) {
      options = options || {};

      var position = options.position || "left";
      if (position != "right")
        position = "left";

      var box = this._graph.select(".chart-axis")
                           .append("svg:g")
                           .attr("class", position);
      var x2 = -10;

      if (position == "right") {
        box.attr("transform", "translate(" + this._width + ",0)");
        x2 = -x2;
      }

      var ticks = scale.ticks(options.ticks || 10);
      var formatter = scale.tickFormat(options.ticks || 10);

      for (var t of ticks) {
        var y = scale(t);
        appendLine(box, 0, y, x2, y);
        box.append("svg:text")
           .attr("dy", "0.3em")
           .attr("text-anchor", position == "left" ? "end" : "start")
           .attr("x", x2 * 1.5)
           .attr("y", y)
           .html(formatter(t));
      }
    }
  }

  return TimeChart;
})();
