from ipywidgets import Layout
from traitlets import List, Enum, Int
from traittypes import DataFrame
from bqplot import Figure, LinearScale, Lines, Label
from bqplot.marks import CATEGORY10
import numpy as np


class Radar(Figure):
    """
    Radar chart created from a pandas DataFrame. Each column of the df will be
    represented as a loop in the radar chart. Each row of the df will be
    reprsented as a spoke of the radar chart.

    Attributes
    ----------
    data: DataFrame
        Data for the radar
    type: {"circle", "polygon"} (default: "circle")
        Type of bands to in the radar
    colors: List (default: CATEGORY10])
        List of colors for the loops of the radar
    num_bands: Int (default: 5)
        Number of bands on the radar. As of now, this attribute is not
        dynamic and it has to set in the cinstructor
    data_range: List (default: [0, 1])
        Data to be mapped to the center and the perimeter of the radar
    """

    data = DataFrame()
    data_range = List([0, 1]).tag(sync=True)
    type = Enum(
        ["circle", "polygon"], default_value="circle", allow_none=True
    ).tag(sync=True)
    colors = List(default_value=CATEGORY10).tag(sync=True)
    num_bands = Int(default_value=5).tag(sync=True)

    def __init__(self, **kwargs):
        super(Radar, self).__init__(**kwargs)

        self.scales = {"x": LinearScale(), "y": LinearScale()}
        # set some defaults for the figure
        self.layout = Layout(min_width="600px", min_height="600px")
        self.max_aspect_ratio = 1
        self.padding_y = 0
        self.preserve_aspect = True

        # handlers for data updates
        self.observe(self.update_data, "data")
        self.observe(self.update_bands, ["type", "num_bands"])

        # create marks
        # spokes (straight lines going away from origin)
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
            fill="inside",
            marker="circle",
            marker_size=50,
        )

        self.band_labels = Label(
            scales=self.scales,
            default_size=12,
            font_weight="normal",
            colors=["black"],
            apply_clip=False,
            align="middle",
        )

        self.marks = [
            self.spokes,
            self.bands,
            self.loops,
            self.band_labels,
        ]

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

        if self.type == "circle":
            t = np.linspace(0, 2 * np.pi, 1000)
            band_data_x, band_data_y = (
                self.scaled_band_data * np.cos(t),
                self.scaled_band_data * np.sin(t),
            )
        elif self.type == "polygon":
            t = np.linspace(0, 2 * np.pi, n + 1)
            band_data_x, band_data_y = (
                self.scaled_band_data * np.sin(t),
                self.scaled_band_data * np.cos(t),
            )

        with self.bands.hold_sync():
            self.bands.x = band_data_x
            self.bands.y = band_data_y

        with self.band_labels.hold_sync():
            self.band_labels.x = [0.0] * (self.num_bands + 1)
            self.band_labels.y = self.scaled_band_data[:, 0]
            self.band_labels.text = ["{:.2f}".format(b) for b in band_data]

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

        # Update marks based on data changes
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

        # update loops
        with self.loops.hold_sync():
            self.loops.x = np.column_stack([data_x.T, data_x.T[:, 0]])
            self.loops.y = np.column_stack([data_y.T, data_y.T[:, 0]])
            self.loops.fill_opacities = [0.1] * len(self.loops.y)
            self.loops.labels = [str(c) for c in self.data.columns]
