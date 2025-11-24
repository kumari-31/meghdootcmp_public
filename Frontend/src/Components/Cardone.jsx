import React from "react";
import "./Cardone.css";

const Cardone = ({ title, stats, chartData, type }) => {
  return (
    <div className={`card-template ${type}`}>
    {/* Card Title */}
    <h3 className="card-title">{title}</h3>

    {/* Card Content */}
    <div className="card-content">
      {/* Stats Section */}
      {stats && (
        <div className="stats">
          {stats.map((stat, index) => (
            <p key={index} className="stat-item">
              <strong>{stat.label}:</strong> {stat.value}
            </p>
          ))}
        </div>
      )}

      {/* Chart Section */}
      {chartData && (
        <div className="chartcard">
          <div className="circle-chart">
            {chartData.map((segment, index) => (
              <div
                key={index}
                className="chart-segment"
                style={{
                  backgroundColor: segment.fill,
                  flex: segment.value,
                }}
              ></div>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
  );
};

export default Cardone;









