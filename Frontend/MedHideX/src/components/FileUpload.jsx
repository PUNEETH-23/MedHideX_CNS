function FileUpload({
  label,
  onChange
}) {

  return (

    <div className="mb-6">

      <label className="block mb-2 text-lg">

        {label}

      </label>

      <input
        type="file"
        onChange={onChange}
        className="bg-slate-700 p-3 rounded-lg w-full"
      />

    </div>

  );
}

export default FileUpload;