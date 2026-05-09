function MetricCard({ title, value }) {

  return (

    <div className="bg-slate-800 p-6 rounded-2xl">

      <h2 className="text-xl font-bold mb-2">
        {title}
      </h2>

      <p className="text-3xl text-cyan-400">
        {value}
      </p>

    </div>

  );
}

export default MetricCard;