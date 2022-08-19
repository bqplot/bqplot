from ipywidgets import Layout
from traitlets import List, Enum, Int, Bool
from traittypes import DataFrame
from bqplot import Figure, LinearScale, Lines, Label
from bqplot.marks import CATEGORY10
import numpy as np


class Radar(Figure):
    """
    Radar chart created from a pandas Dataframe. Each column of the df will be
    represented as a loop in the radar chart. Each row of the df will be
    represented as a spoke of the radar chart

    Attributes
    ----------
    data: DataFrame
        data for the radar
    band_type: {"circle", "polygon"} (default: "circle")
        type of bands to display in the radar
    num_bands: Int (default: 5)
        number of bands on the radar. As of now, this attribute is not
        dynamic and it has to set in the constructor
    data_range: List (default: [0, 1])
        range of data
    fill: Bool(default: True)
        flag which lets us fill the radar loops or not
    """

    data = DataFrame()
    data_range = List([0, 1]).tag(sync=True)
    band_type = Enum(
        ["circle", "polygon"], default_value="circle", allow_none=True
    ).tag(sync=True)
    colors = List(default_value=CATEGORY10).tag(sync=True)
    num_bands = Int(default_value=5).tag(sync=True)
    fill = Bool(default_value=False).tag(sync=True)

    def __init__(self, **kwargs):
        super(Radar, self).__init__(**kwargs)
        self.scales = {"x": LinearScale(), "y": LinearScale()}
        # set some defaults for the figure
        self.layout = Layout(min_width="600px", min_height="600px")
        self.max_aspect_ratio = 1
        self.preserve_aspect = True

        # marks for the radar figure

        # spokes (straight lines going away from the center)
        self.spokes = Lines(
            scales=self.scales, colors=["#ccc"], stroke_width=0.5
        )

        # bands
        self.bands = Lines(
            colors=["#ccc"], scales=self.scales, stroke_width=0.5
        )

        # loops of the radar
        self.loops = Lines(
            scales=self.scales,
            display_legend=True,
            colors=self.colors,
            stroke_width=2,
            fill="inside" if self.fill else "none",
            marker="circle",
            marker_size=50,
        )

        self.band_labels = Label(
            scales=self.scales,
            default_size=12,
            font_weight="normal",
            apply_clip=False,
            colors=["#ccc"],
            align="middle",
        )

        self.spoke_labels = Label(
            scales=self.scales,
            default_size=14,
            font_weight="bold",
            apply_clip=False,
            colors=["#ccc"],
            align="middle",
        )

        self.marks = [
            self.spokes,
            self.bands,
            self.loops,
            self.band_labels,
            self.spoke_labels,
        ]

        # handlers for data updates
        self.observe(self.update_data, "data")
        self.observe(self.update_bands, ["band_type", "num_bands"])
        self.observe(self.update_fill, "fill")

        self.loops.on_legend_click(self.on_legend_click)
        self.loops.on_background_click(self.reset)

        self.update_bands(None)
        self.update_data(None)

    def update_bands(self, *args):
        band_data = np.linspace(
            self.data_range[0], self.data_range[1], self.num_bands + 1
        )
        self.scaled_band_data = (
            (band_data - self.data_range[0])
            / (self.data_range[1] - self.data_range[0])
        )[:, np.newaxis]

        n = len(self.data.index)

        if self.band_type == "circle":
            t = np.linspace(0, 2 * np.pi, 1000)
            band_data_x, band_data_y = (
                self.scaled_band_data * np.cos(t),
                self.scaled_band_data * np.sin(t),
            )
        elif self.band_type == "polygon":
            t = np.linspace(0, 2 * np.pi, n + 1)
            band_data_x, band_data_y = (
                self.scaled_band_data * np.sin(t),
                self.scaled_band_data * np.cos(t),
            )

        with self.bands.hold_sync():
            self.bands.x = band_data_x
            self.bands.y = band_data_y

        with self.band_labels.hold_sync():
            self.band_labels.x = self.scaled_band_data[:, 0]
            self.band_labels.y = [0.0] * (self.num_bands + 1)
            self.band_labels.text = ["{:.0%}".format(b) for b in band_data]

    def update_data(self, *args):
        self.update_bands(None)
        rows = list(self.data.index)
        n = len(rows)

        # spokes representing each data set
        self.spoke_data_t = np.linspace(0, 2 * np.pi, n + 1)[:-1]
        spoke_data_x, spoke_data_y = (
            np.sin(self.spoke_data_t),
            np.cos(self.spoke_data_t),
        )

        # Update mark data based on data changes
        with self.spokes.hold_sync():
            self.spokes.x = np.column_stack(
                [self.scaled_band_data[1] * spoke_data_x, spoke_data_x]
            )
            self.spokes.y = np.column_stack(
                [self.scaled_band_data[1] * spoke_data_y, spoke_data_y]
            )

        scaled_data = (self.data.values - self.data_range[0]) / (
            self.data_range[1] - self.data_range[0]
        )
        data_x = scaled_data * np.sin(self.spoke_data_t)[:, np.newaxis]
        data_y = scaled_data * np.cos(self.spoke_data_t)[:, np.newaxis]

        # update data lines
        with self.loops.hold_sync():
            self.loops.x = np.column_stack([data_x.T, data_x.T[:, 0]])
            self.loops.y = np.column_stack([data_y.T, data_y.T[:, 0]])
            if self.fill:
                self.loops.fill = "inside"
                self.loops.fill_opacities = [0.2] * len(self.loops.y)
            else:
                self.loops.fill = "none"
                self.loops.fill_opacities = [0.0] * len(self.loops.y)
            self.loops.labels = [str(c) for c in self.data.columns]

        # update spoke labels
        t = np.linspace(0, 2 * np.pi, n + 1)
        with self.spoke_labels.hold_sync():
            self.spoke_labels.text = [str(row) for row in rows]
            self.spoke_labels.x = np.sin(t)
            self.spoke_labels.y = np.cos(t)

    def update_fill(self, *args):
        if self.fill:
            with self.loops.hold_sync():
                self.loops.fill = "inside"
                self.loops.fill_opacities = [0.2] * len(self.loops.y)
        else:
            self.loops.fill = "none"
            self.loops.fill_opacities = [0.0] * len(self.loops.y)

    def on_legend_click(self, line, target):
        selected_ix = target["data"]["index"]
        n = len(line.y)
        opacities = line.opacities
        if opacities is None or len(opacities) == 0:
            opacities = [1.0] * n

        new_opacities = [0.1] * n
        new_opacities[selected_ix] = 1
        line.opacities = new_opacities

    def reset(self, line, target):
        line.opacities = [1.0] * len(line.y)
