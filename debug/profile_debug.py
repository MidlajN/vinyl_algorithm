import matplotlib.pyplot as plt


def show_profiles(
    profiles
):
    plt.figure(figsize=(14, 8))

    plt.plot(
        profiles["brightness"],
        label="Brightness"
    )

    plt.plot(
        profiles["texture"],
        label="Texture"
    )

    plt.plot(
        profiles["variance"],
        label="Variance"
    )

    plt.legend()

    plt.xlabel("Radius (px)")
    plt.ylabel("Signal")

    plt.title(
        "Groove Detection Signals"
    )

    plt.grid(True)

    plt.show()