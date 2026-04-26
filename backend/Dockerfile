FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    CARGO_HOME=/usr/local/cargo \
    RUSTUP_HOME=/usr/local/rustup \
    PATH=/usr/local/cargo/bin:$PATH

# - ffmpeg: transcode browser webm/opus → WAV for Gradium STT.
# - build-essential + pkg-config + libssl-dev: linker + crates' deps.
# - curl + ca-certificates: rustup install.
# - rustup → current stable (Debian's rustc is 1.85; gradbot needs 1.86+).
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ffmpeg \
        build-essential \
        pkg-config \
        libssl-dev \
        libopus-dev \
        cmake \
        curl \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && curl -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable --profile minimal --no-modify-path \
    && rustc --version

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY init.sql ./
COPY seed.py ./

EXPOSE 8080
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
