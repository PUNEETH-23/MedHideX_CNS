function Loader() {

  return (

    <div className="flex flex-col items-center justify-center mt-10">

      <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-700 border-t-cyan-400"></div>

      <p className="mt-4 text-cyan-400 text-lg">
        Processing...
      </p>

    </div>

  );
}

export default Loader;