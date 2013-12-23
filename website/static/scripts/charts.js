var TimeChart;
var getTimeBounds;

(function() {
  function override() {
    var args = Array.slice(arguments, 0);
    var merged = {};

    for (var obj of args) {
      if (!obj)
        continue;

      for (var k in obj) {
        merged[k] = obj[k];
      }
    }

    return merged;
  }

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
    this._options = override({
      palette: d3.scale.category10(),
      width: 800,
      height: 600,
      margin: 40,
    }, options);

    this._paletteCount = 0;
    this._padding = {
      left: this._options.margin,
      right: this._options.margin,
      top: this._options.margin,
      bottom: this._options.margin
    }

    var extents = [new Date(options.minTime * 1000), new Date(options.maxTime * 1000)];
    this._timeScale = d3.time.scale().domain(extents).range([0, this._options.width]);

    var margin = this._options.margin;

    d3.select(element).html("");

    this._graph = d3.select(element)
                    .append("svg:svg");

    this._updateViewBox();

    var border = this._graph.append("svg:g")
                            .attr("class", "chart-border");

    appendLine(border, 0, 0, 0, this._options.height, "left");
    appendLine(border, this._options.width, 0, this._options.width, this._options.height, "right");
    appendLine(border, 0, 0, this._options.width, 0, "top");
    appendLine(border, 0, this._options.height, this._options.width, this._options.height, "bottom");

    this._graph.append("svg:g")
               .attr("class", "chart-axis");

    this._graph.append("svg:g")
               .attr("class", "chart-data");

    this._drawXAxis();
  }

  TimeChart.prototype = {
    _paletteCount: null,
    _padding: null,

    _timeScale: null,
    _graph: null,

    addLineSeries: function(series, options) {
      options = options || {};

      var bounds = getBounds(series, "value");

      var scale = d3.scale.linear().domain(bounds).nice().range([this._options.height, 0]);
      var palette = this._options.palette;
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

    _updateViewBox: function() {
      var viewBox = "-" + this._padding.left + " " +
                    "-" + this._padding.top + " " +
                    (this._options.width + this._padding.left + this._padding.right) + " " +
                    (this._options.height + this._padding.top + this._padding.bottom) + " ";

      this._graph.attr("viewBox", viewBox);
    },

    _drawXAxis: function() {
      var scale = this._timeScale;

      var box = this._graph.select(".chart-axis")
                           .append("svg:g")
                           .attr("class", "bottom")
                           .attr("transform", "translate(0," + this._options.height + ")");
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
        box.attr("transform", "translate(" + this._options.width + ",0)");
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
})();
