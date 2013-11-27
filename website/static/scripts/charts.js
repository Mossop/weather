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
    this._width = options.width || 600;
    this._height = options.height || 450;

    var extents = [new Date(options.minTime * 1000), new Date(options.maxTime * 1000)];
    this._timeScale = d3.time.scale().domain(extents).range([0, this._width]);

    this._seriesMap = new Map();

    var margin = options.margin || 40;

    d3.select(element).html("");

    this._graph = d3.select(element)
                    .append("svg:svg")
                    .attr("viewBox", "0 0 " + (this._width + margin * 2) + " " + (this._height + margin * 2))
                    .append("svg:g")
                    .attr("transform", "translate(" + margin + "," + margin + ")");

    var border = this._graph.append("svg:g")
                            .attr("class", "border");

    appendLine(border, 0, 0, 0, this._height, "left");
    appendLine(border, this._width, 0, this._width, this._height, "right");
    appendLine(border, 0, 0, this._width, 0, "top");
    appendLine(border, 0, this._height, this._width, this._height, "bottom");

    this._graph.append("svg:g")
               .attr("class", "axis");

    this._graph.append("svg:g")
               .attr("class", "data");

    this._drawXAxis();
  }

  TimeChart.prototype = {
    _width: null,
    _height: null,
    _palette: null,

    _paletteCount: null,

    _timeScale: null,
    _graph: null,
    _seriesMap: null,

    addLineSeries: function(series, options) {
      options = options || {};

      var bounds = getBounds(series, "value");

      var scale = d3.scale.linear().domain(bounds).nice().range([this._height, 0]);

      for (var s of series) {
        if (this._seriesMap.has(s.id)) {
          var seriesInfo = this._seriesMap.get(s.id);
        }
        else {
          seriesInfo = {
            color: this._palette(this._paletteCount++)
          };
          this._seriesMap.set(s.id, seriesInfo);
        }

        this._graph.select(".data")
                   .append("svg:g")
                   .attr("class", "series " + s.id)
                   .attr("stroke", seriesInfo.color)
                   .append("svg:path")
                   .attr("class", "line")
                   .datum(s.data)
                   .attr("d", d3.svg.line()
                                    .x(d => { return this._timeScale(new Date(d["time"] * 1000)) })
                                    .y(d => { return scale(d["value"]) })
                                    .interpolate(options.interpolate || "basis"));
      }

      return scale;
    },

    _drawXAxis: function() {
      var scale = this._timeScale;

      var box = this._graph.select(".axis")
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
           .attr("y", y2 * 2)
           .attr("dy", "1em")
           .html(formatter(t));
      }
    },

    drawAxis: function(scale, options) {
      options = options || {};

      var position = options.position || "left";
      if (position != "right")
        position = "left";

      var box = this._graph.select(".axis")
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
           .attr("x", x2 * 2)
           .attr("y", y)
           .html(formatter(t));
      }
    }
  }

  return TimeChart;
})();
