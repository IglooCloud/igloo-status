import React, { Component } from "react";
import moment from "moment";
import Typography from "@material-ui/core/Typography";
import Paper from "@material-ui/core/Paper";
import Skeleton from "@material-ui/core/Skeleton";
import Grid from "@material-ui/core/Grid";
import Tooltip from "@material-ui/core/Tooltip";
import Snackbar from "@material-ui/core/Snackbar";
import IconButton from "@material-ui/core/IconButton";
import { withStyles } from "@material-ui/core/styles";
import Slide from "@material-ui/core/Slide";
import Refresh from "@material-ui/icons/Refresh";
import { withTranslation } from "react-i18next";
import "./styles/App.css";

function SlideUpwards(props) {
  return <Slide {...props} direction="up" />;
}

const CustomTooltip = withStyles({
  tooltipPlacementTop: {
    marginBottom: "8px",
  },
  tooltip: { backgroundColor: "rgba(97, 97, 97)" },
  arrow: { color: "rgba(97, 97, 97)" },
})(Tooltip);

const debounce = (func, wait) => {
  let timeout;

  return (...args) => {
    const later = () => {
      timeout = null;

      func(...args);
    };

    clearTimeout(timeout);

    timeout = setTimeout(later, wait);
  };
};

export default withTranslation()(
  class App extends Component {
    constructor(props) {
      super(props);

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("service-worker.js");
      }

      this.state = {
        scrollTop: 0,
        online: true,
        averages: {},
        apiHistory: [],
        loading: true,
        error: false,
      };
    }

    fetchData = async () => {
      let online = await fetch("https://health.igloo.ooo/online")
        .then(async (response) => {
          if (response.status !== 200) {
            return null;
          }

          return await response.json();
        })
        .catch(() => null);

      let averages = await fetch("https://health.igloo.ooo/averages")
        .then(async (response) => {
          if (response.status !== 200) {
            return {};
          }

          return (await response.json()) || {};
        })
        .catch(() => ({}));

      let apiHistory = await fetch(
        "https://health.igloo.ooo/history?service=api"
      )
        .then(async (response) => {
          if (response.status !== 200) {
            return [];
          }

          let uptimeList = (await response.json()).slice(-30);

          if (uptimeList.length < 30) {
            Array(30 - uptimeList.length)
              .fill()
              .map(() =>
                uptimeList.push({
                  date: moment(uptimeList[0]).subtract(1, "days"),
                  uptime: null,
                })
              );
          }

          return (
            uptimeList.sort((a, b) =>
              +new Date(a.date) > +new Date(b.date)
                ? 1
                : +new Date(a.date) === +new Date(b.date)
                ? 0
                : -1
            ) || []
          );
        })
        .catch(() => []);

      this.setState({
        online,
        averages,
        apiHistory,
        loading: false,
        error:
          online === null ||
          !averages["24hours"] ||
          !averages["7days"] ||
          !averages["30days"] ||
          !apiHistory[0],
      });
    };

    updateDimensions = () => {
      const {
        greaterThan960,
        greaterThan752,
        greaterThan448,
        greaterThan352,
      } = this.state;

      if (window.innerWidth > 960) {
        !greaterThan960 && this.setState({ greaterThan960: true });
      } else {
        greaterThan960 && this.setState({ greaterThan960: false });
      }

      if (window.innerWidth > 752) {
        !greaterThan752 && this.setState({ greaterThan752: true });
      } else {
        greaterThan752 && this.setState({ greaterThan752: false });
      }

      if (window.innerWidth > 448) {
        !greaterThan448 && this.setState({ greaterThan448: true });
      } else {
        greaterThan448 && this.setState({ greaterThan448: false });
      }

      if (window.innerWidth > 352) {
        !greaterThan352 && this.setState({ greaterThan352: true });
      } else {
        greaterThan352 && this.setState({ greaterThan352: false });
      }
    };

    componentDidMount() {
      this.updateDimensions();
      window.addEventListener("resize", debounce(this.updateDimensions));

      this.fetchData();
      setInterval(this.fetchData, 60_000);
    }

    componentWillUnmount() {
      window.removeEventListener("resize", debounce(this.updateDimensions));
    }

    render() {
      const { t, i18n } = this.props;
      const {
        scrollTop,
        online,
        averages: {
          "24hours": averageDay,
          "7days": averageWeek,
          "30days": averageMonth,
        },
        apiHistory,
        greaterThan960,
        greaterThan752,
        greaterThan448,
        greaterThan352,
        error,
        loading,
      } = this.state;

      const percentageStyle = {
        maxWidth: "256px",
        margin: "auto",
        textAlign: "center",
      };

      moment.updateLocale(
        i18n.language,
        i18n.language === "en"
          ? require("moment/locale/en-gb")
          : require("moment/locale/" + i18n.language)
      );

      return (
        <>
          <div
            style={{
              height: "100%",
              backgroundColor: online ? "#0057cb" : "#f44336",
              overflowY: "auto",
              transition: "background-color 1s",
            }}
            className="notSelectable defaultCursor"
            onScroll={({ target: { scrollTop } }) =>
              this.setState({ scrollTop })
            }
          >
            <Typography
              variant={greaterThan752 ? "h1" : greaterThan448 ? "h2" : "h3"}
              style={{
                color: "white",
                height: "256px",
                width: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                position: "absolute",
                opacity: Math.max(
                  1 - scrollTop / (greaterThan752 ? 64 : 96),
                  0
                ),
                pointerEvents: "none",
                zIndex: 10,
              }}
            >
              {loading || error ? (
                <Skeleton
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.11)",
                    maxWidth: "512px",
                    width: "calc(100% - 64px)",
                  }}
                />
              ) : (
                t`Igloo is ` + (online ? t`online` : t`offline`)
              )}
            </Typography>
            <Paper
              style={{
                width: "100%",
                minHeight: "100%",
                borderRadius:
                  (1 - scrollTop / 256) * 32 +
                  "px " +
                  (1 - scrollTop / 256) * 32 +
                  "px 0 0",
                boxShadow:
                  "0px -5px 5px -3px rgba(0,0,0,0.2), 0px -8px 10px 1px rgba(0,0,0,0.14), 0px -3px 14px 2px rgba(0,0,0,0.12)",
                marginTop: "256px",
                zIndex: 20,
              }}
              elevation={8}
            >
              <div
                style={{
                  maxWidth: "1080px",
                  margin: "0 auto",
                  padding: "0 48px",
                }}
              >
                <Grid
                  container
                  style={{ padding: greaterThan752 ? "96px 0" : "48px 0" }}
                >
                  <Grid
                    item
                    xs={greaterThan752 ? 4 : 12}
                    style={{ margin: "16px 0" }}
                  >
                    <Typography
                      variant={greaterThan960 || !greaterThan752 ? "h2" : "h3"}
                      style={{ ...percentageStyle, fontWeight: "bold" }}
                    >
                      {loading || error ? (
                        <Skeleton />
                      ) : (
                        (averageDay * 100).toFixed(2) + "%"
                      )}
                    </Typography>
                    <Typography
                      variant={greaterThan960 || !greaterThan752 ? "h5" : "h6"}
                      style={{ ...percentageStyle, fontWeight: 300 }}
                    >
                      {loading || error ? <Skeleton /> : t`Last 24 hours`}
                    </Typography>
                  </Grid>
                  <Grid
                    item
                    xs={greaterThan752 ? 4 : 12}
                    style={{ margin: "16px 0" }}
                  >
                    <Typography
                      variant={greaterThan960 || !greaterThan752 ? "h2" : "h3"}
                      style={{ ...percentageStyle, fontWeight: "bold" }}
                    >
                      {loading || error ? (
                        <Skeleton />
                      ) : (
                        (averageWeek * 100).toFixed(2) + "%"
                      )}
                    </Typography>
                    <Typography
                      variant={greaterThan960 || !greaterThan752 ? "h5" : "h6"}
                      style={{ ...percentageStyle, fontWeight: 300 }}
                    >
                      {loading || error ? <Skeleton /> : t`Last 7 days`}
                    </Typography>
                  </Grid>
                  <Grid
                    item
                    xs={greaterThan752 ? 4 : 12}
                    style={{ margin: "16px 0" }}
                  >
                    <Typography
                      variant={greaterThan960 || !greaterThan752 ? "h2" : "h3"}
                      style={{ ...percentageStyle, fontWeight: "bold" }}
                    >
                      {loading || error ? (
                        <Skeleton />
                      ) : (
                        (averageMonth * 100).toFixed(2) + "%"
                      )}
                    </Typography>
                    <Typography
                      variant={greaterThan960 || !greaterThan752 ? "h5" : "h6"}
                      style={{ ...percentageStyle, fontWeight: 300 }}
                    >
                      {loading || error ? <Skeleton /> : t`Last 30 days`}
                    </Typography>
                  </Grid>
                </Grid>
                <Grid container>
                  <Grid item xs>
                    <Typography
                      variant={greaterThan448 ? "h5" : "h6"}
                      style={{
                        fontWeight: "bold",
                        fontSize: greaterThan352 ? "" : "1.15rem",
                      }}
                    >
                      {loading || error ? (
                        <Skeleton style={{ width: "90%", maxWidth: "192px" }} />
                      ) : (
                        t`API uptime`
                      )}
                    </Typography>
                  </Grid>
                  <Grid item xs>
                    <Typography
                      variant={greaterThan448 ? "h5" : "h6"}
                      style={{
                        textAlign: "right",
                        fontWeight: 300,
                        fontSize: greaterThan352 ? "" : "1.15rem",
                      }}
                    >
                      {loading || error ? (
                        <Skeleton
                          style={{
                            width: "90%",
                            maxWidth: "192px",
                            marginLeft: "auto",
                          }}
                        />
                      ) : (
                        t`Last 30 days`
                      )}
                    </Typography>
                  </Grid>
                </Grid>
                <Grid
                  container
                  style={{
                    margin: "16px -2px 0",
                    width: "calc(100% + 4px)",
                    paddingBottom: "64px",
                  }}
                >
                  {loading || error
                    ? [...Array(30)].map((_, index) => (
                        <Grid
                          item
                          style={{
                            width:
                              "calc((100% - " +
                              (greaterThan752 ? 30 : 15) * 4 +
                              "px)/" +
                              (greaterThan752 ? 30 : 15) +
                              ")",
                            height: "24px",
                            borderRadius: "4px",
                            margin: "2px",
                          }}
                          key={"uptime-skeleton-" + index}
                        >
                          <Skeleton
                            variant="rectangular"
                            style={{
                              borderRadius: "4px",
                              height: "100%",
                            }}
                          />
                        </Grid>
                      ))
                    : apiHistory.map(({ date, uptime }) => (
                        <CustomTooltip
                          title={
                            <Typography
                              variant="body1"
                              style={{ textAlign: "center" }}
                              className="notSelectable"
                            >
                              <font style={{ fontWeight: "bold" }}>
                                {moment(date).format("D MMM")}
                              </font>
                              <br />
                              {(uptime * 100).toFixed(2) + "%"}
                            </Typography>
                          }
                          enterTouchDelay={0}
                          arrow
                          placement="top"
                          {...(uptime === null ? { open: false } : {})}
                        >
                          <Grid
                            item
                            style={{
                              backgroundColor:
                                uptime > 0.99
                                  ? "#00B512"
                                  : uptime > 0.95
                                  ? "#ffc804"
                                  : uptime === null
                                  ? "#eee"
                                  : "#f44336",
                              height: "24px",
                              width:
                                "calc((100% - " +
                                (greaterThan752 ? 30 : 15) * 4 +
                                "px)/" +
                                (greaterThan752 ? 30 : 15) +
                                ")",
                              borderRadius: "4px",
                              margin: "2px",
                            }}
                          />
                        </CustomTooltip>
                      ))}
                </Grid>
              </div>
            </Paper>
          </div>
          <Snackbar
            open={error}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "center",
            }}
            message={t`We couldn't load this page`}
            TransitionComponent={SlideUpwards}
            action={
              <IconButton style={{ color: "white" }}>
                <Refresh />
              </IconButton>
            }
          />
        </>
      );
    }
  }
);
