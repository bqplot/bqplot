FROM mambaorg/micromamba:0.14.0

# Install basic tools
RUN micromamba install -qy -c conda-forge python nodejs yarn \
    && useradd --shell /bin/bash jovyan \
    && chown jovyan $HOME

# Upgrade JupyterLab
RUN pip install jupyterlab==3.0.11

# Install bqplot
COPY ./bqplot/ /tmp/bqplot-dev/bqplot/
COPY ./js/ /tmp/bqplot-dev/js/
COPY ./*.* ./LICENSE /tmp/bqplot-dev/

RUN cd /tmp/bqplot-dev \
    && pip install -e . \
    && chown -R jovyan /tmp/bqplot-dev

USER root
USER jovyan
