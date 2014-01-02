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
      axisTickSize: 10,
      margin: 5,
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
      options = override({
        seriesKey: (d => { return d.id }),
        seriesData: (d => { return d.data }),
        interpolate: "basis"
      }, options);

      var bounds = getBounds(series, "value");

      var scale = d3.scale.linear().domain(bounds).nice().range([this._options.height, 0]);
      var palette = this._options.palette;

      this._graph.select(".chart-data")
                 .selectAll(".chart-series")
                 .data(series, options.seriesKey)
                 .enter()
                 .append("svg:g")
                 .attr("id", d => { return "chart-series-" + options.seriesKey(d) })
                 .attr("class", "chart-series")
                 .attr("color", function(d) { return palette(Array.prototype.indexOf.call(this.parentNode.childNodes, this)) })
                 .append("svg:path")
                 .attr("class", "chart-line")
                 .datum(options.seriesData)
                 .attr("d", d3.svg.line()
                                  .x(d => { return this._timeScale(new Date(d["time"] * 1000)) })
                                  .y(d => { return scale(d["value"]) })
                                  .interpolate(options.interpolate));

      return scale;
    },

    addBarSeries: function(series, options) {
      options = override({
        seriesKey: (d => { return d.id }),
        seriesData: (d => { return d.data }),
      }, options);

      var bounds = getBounds(series, "value");
      if (bounds[0] > 0)
        bounds[0] = 0;
      if (bounds[1] < 0)
        bounds[1] = 0;

      var scale = d3.scale.linear().domain(bounds).nice().range([this._options.height, 0]);
      var palette = this._options.palette;

      y = (d) => {
        return d["value"] > 0 ? scale(d["value"]) : scale(0);
      }

      height = (d) => {
        return d["value"] > 0 ? scale(0) - scale(d["value"]) :
                                scale(d["value"]) - scale(0);
      }

      width = (d) => {
        return this._timeScale(new Date((d["time"] + d["duration"]) * 1000)) -
               this._timeScale(new Date(d["time"] * 1000))
      }

      this._graph.select(".chart-data")
                 .selectAll(".chart-series")
                 .data(series, options.seriesKey)
                 .enter()
                 .append("svg:g")
                 .attr("id", d => { return "chart-series-" + options.seriesKey(d) })
                 .attr("class", "chart-series")
                 .attr("color", function(d) { return palette(Array.prototype.indexOf.call(this.parentNode.childNodes, this)) })
                 .selectAll(".chart-bar")
                 .data(options.seriesData)
                 .enter()
                 .append("svg:rect")
                 .attr("class", "chart-bar")
                 .attr("x", d => { return this._timeScale(new Date(d["time"] * 1000)) })
                 .attr("y", y)
                 .attr("width", width)
                 .attr("height", height)

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
      var maxWidth = 0;
      var scale = this._timeScale;

      var box = this._graph.select(".chart-axis")
                           .append("svg:g")
                           .attr("class", "bottom")
                           .attr("transform", "translate(0," + this._options.height + ")");

      var ticks = scale.ticks();
      var formatter = scale.tickFormat();

      for (var t of ticks) {
        var x = scale(t);
        appendLine(box, x, 0, x, this._options.axisTickSize, "tick-line");
        var text = box.append("svg:text")
                      .attr("class", "tick-text");
        text.text(formatter(t));
        var bbox = text.node().getBBox();
        maxWidth = Math.max(bbox.width + bbox.x, maxWidth);

        text.attr("transform", "translate(" + x + ", " + (this._options.axisTickSize * 2) + "), " +
                               "rotate(90), " +
                               "translate(0, " + (-bbox.y / 2) + ")");
      }

      this._padding.bottom = maxWidth + (this._options.axisTickSize * 2) + this._options.margin;
      this._updateViewBox();
    },

    drawAxis: function(scale, options) {
      options = override({
        position: "left",
        ticks: 10
      }, options);

      if (options.position != "right")
        options.position = "left";

      var maxWidth = 0;

      var box = this._graph.select(".chart-axis")
                           .append("svg:g")
                           .attr("class", options.position);
      var x2 = -this._options.axisTickSize;

      if (options.position == "right") {
        box.attr("transform", "translate(" + this._options.width + ",0)");
        x2 = -x2;
      }

      var ticks = scale.ticks(options.ticks);
      var formatter = scale.tickFormat(options.ticks);

      for (var t of ticks) {
        var y = scale(t);
        appendLine(box, 0, y, x2, y, "tick-line");
        var text = box.append("svg:text")
                      .attr("class", "tick-text")
                      .attr("text-anchor", options.position == "left" ? "end" : "start");
        text.text(formatter(t));
        var bbox = text.node().getBBox();
        var width = options.position == "left" ? -bbox.x : bbox.width + bbox.x;
        maxWidth = Math.max(width, maxWidth);

        text.attr("transform", "translate(" + (x2 * 2) + ", " + (y + (-bbox.y / 2)) + ")");
      }

      var padding = maxWidth + (this._options.axisTickSize * 2);

      if ("title" in options) {
        padding += this._options.axisTickSize * 2;

        var text = box.append("svg:text")
                      .attr("class", "axis-title")
                      .attr("text-anchor", "middle");
        text.text(options.title);
        var bbox = text.node().getBBox();
        var xtrans = options.position == "left" ? -padding : padding;
        text.attr("transform", "translate(" + xtrans + ", " + (this._options.height / 2) + "), rotate(-90)");
        padding += -bbox.y
      }

      this._padding[options.position] = padding + this._options.margin;
      this._updateViewBox();
    }
  }
})();
